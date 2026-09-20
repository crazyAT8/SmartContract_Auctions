import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SealedBidReveal } from '@/components/auctions/SealedBidReveal'
import toast from 'react-hot-toast'
import { ethers } from 'ethers'

const mockUseWeb3 = jest.fn()
const mockReveal = jest.fn()
const mockWait = jest.fn()

jest.mock('@/contexts/Web3Context', () => ({
  useWeb3: () => mockUseWeb3(),
}))

jest.mock('@/contracts/contracts', () => ({
  getAuctionABI: () => [{ type: 'function', name: 'reveal' }],
}))

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers')
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: jest.fn().mockImplementation(() => ({
        reveal: (...args: unknown[]) => mockReveal(...args),
      })),
    },
    Contract: jest.fn().mockImplementation(() => ({
      reveal: (...args: unknown[]) => mockReveal(...args),
    })),
  }
})

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}))

const ACCOUNT = '0x3333333333333333333333333333333333333333'
const CONTRACT = '0x4444444444444444444444444444444444444444'
const AUCTION_ID = 'auc-sealed-1'

function phaseResponse(overrides: { biddingEnd?: number; revealEnd?: number } = {}) {
  const now = Math.floor(Date.now() / 1000)
  return {
    biddingEnd: overrides.biddingEnd ?? now - 60,
    revealEnd: overrides.revealEnd ?? now + 3600,
  }
}

describe('SealedBidReveal', () => {
  const onRevealed = jest.fn()
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
    mockUseWeb3.mockReturnValue({
      isConnected: true,
      account: ACCOUNT,
      signer: { signMessage: jest.fn() },
    })
    mockWait.mockResolvedValue({})
    mockReveal.mockResolvedValue({ wait: mockWait })
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('shows loading state while fetching phase', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    render(
      <SealedBidReveal
        auctionId={AUCTION_ID}
        contractAddress={CONTRACT}
        onRevealed={onRevealed}
      />
    )
    expect(screen.getByText(/loading sealed bid phase/i)).toBeInTheDocument()
  })

  it('renders nothing during bidding phase', async () => {
    const now = Math.floor(Date.now() / 1000)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => phaseResponse({ biddingEnd: now + 3600, revealEnd: now + 7200 }),
    })

    const { container } = render(
      <SealedBidReveal
        auctionId={AUCTION_ID}
        contractAddress={CONTRACT}
        onRevealed={onRevealed}
      />
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await waitFor(() => {
      expect(screen.queryByText(/loading sealed bid phase/i)).not.toBeInTheDocument()
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('shows reveal UI with manual fields when no stored bid', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => phaseResponse(),
    })

    render(
      <SealedBidReveal
        auctionId={AUCTION_ID}
        contractAddress={CONTRACT}
        onRevealed={onRevealed}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/reveal phase/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/bid value \(eth\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/secret/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reveal bid/i })).toBeDisabled()
  })

  it('prompts to connect wallet during reveal phase', async () => {
    mockUseWeb3.mockReturnValue({
      isConnected: false,
      account: null,
      signer: null,
    })
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => phaseResponse(),
    })

    render(
      <SealedBidReveal
        auctionId={AUCTION_ID}
        contractAddress={CONTRACT}
        onRevealed={onRevealed}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/connect your wallet to reveal your bid/i)).toBeInTheDocument()
    })
  })

  it('shows stored bid and reveals from sessionStorage', async () => {
    const valueWei = ethers.parseEther('0.5').toString()
    const secret =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    sessionStorage.setItem(
      `sealedBidReveal_${AUCTION_ID}_${ACCOUNT}`,
      JSON.stringify({ valueWei, secret })
    )

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => phaseResponse(),
    })

    render(
      <SealedBidReveal
        auctionId={AUCTION_ID}
        contractAddress={CONTRACT}
        onRevealed={onRevealed}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/stored bid from this browser/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/0\.5000 ETH/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /reveal your bid/i }))

    await waitFor(() => {
      expect(mockReveal).toHaveBeenCalledWith(BigInt(valueWei), secret)
    })
    await waitFor(() => expect(onRevealed).toHaveBeenCalled())
    expect(sessionStorage.getItem(`sealedBidReveal_${AUCTION_ID}_${ACCOUNT}`)).toBeNull()
  })

  it('validates manual secret length before reveal', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => phaseResponse(),
    })

    render(
      <SealedBidReveal
        auctionId={AUCTION_ID}
        contractAddress={CONTRACT}
        onRevealed={onRevealed}
      />
    )

    await waitFor(() => screen.getByLabelText(/bid value \(eth\)/i))
    fireEvent.change(screen.getByLabelText(/bid value \(eth\)/i), {
      target: { value: '0.25' },
    })
    fireEvent.change(screen.getByLabelText(/secret/i), {
      target: { value: '0xshort' },
    })
    fireEvent.click(screen.getByRole('button', { name: /reveal bid/i }))

    expect(toast.error).toHaveBeenCalledWith(
      'Secret must be 32 bytes (64 hex characters)'
    )
    expect(mockReveal).not.toHaveBeenCalled()
  })

  it('reveals using manual value and secret', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => phaseResponse(),
    })

    const secret =
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

    render(
      <SealedBidReveal
        auctionId={AUCTION_ID}
        contractAddress={CONTRACT}
        onRevealed={onRevealed}
      />
    )

    await waitFor(() => screen.getByLabelText(/bid value \(eth\)/i))
    fireEvent.change(screen.getByLabelText(/bid value \(eth\)/i), {
      target: { value: '1' },
    })
    fireEvent.change(screen.getByLabelText(/secret/i), {
      target: { value: secret },
    })
    fireEvent.click(screen.getByRole('button', { name: /reveal bid/i }))

    await waitFor(() => {
      expect(mockReveal).toHaveBeenCalledWith(ethers.parseEther('1'), secret)
    })
    await waitFor(() => expect(onRevealed).toHaveBeenCalled())
  })

  it('shows error with retry when phase fetch fails', async () => {
    fetchMock.mockResolvedValue({ ok: false })

    render(
      <SealedBidReveal
        auctionId={AUCTION_ID}
        contractAddress={CONTRACT}
        onRevealed={onRevealed}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/failed to load sealed bid phase/i)).toBeInTheDocument()

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => phaseResponse(),
    })
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText(/reveal phase/i)).toBeInTheDocument()
    })
  })
})
