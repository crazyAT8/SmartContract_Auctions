import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BiddingInterface } from '@/components/auctions/BiddingInterface'
import toast from 'react-hot-toast'

const mockUseWeb3 = jest.fn()
const mockApiRequest = jest.fn()

jest.mock('@/contexts/Web3Context', () => ({
  useWeb3: () => mockUseWeb3(),
}))

jest.mock('@/utils/api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}))

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}))

const ACCOUNT = '0x1111111111111111111111111111111111111111'

function connectedWeb3(overrides: Record<string, unknown> = {}) {
  return {
    isConnected: true,
    account: ACCOUNT,
    signer: { signMessage: jest.fn() },
    provider: {
      getBalance: jest.fn().mockResolvedValue(BigInt('10000000000000000000')), // 10 ETH
    },
    ...overrides,
  }
}

// BiddingInterface compares bidAmount (ETH) to getMinBid() via parseFloat,
// so tests use ETH-scale strings for highestBid / reserve when validating bids.
const baseAuction = {
  id: 'auc-1',
  type: 'ENGLISH',
  status: 'ACTIVE',
  contractAddress: null as string | null,
  currentPrice: null as string | null,
  highestBid: '1',
  reservePrice: '0.5',
  startPrice: '0.5',
}

describe('BiddingInterface', () => {
  const onBidPlaced = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWeb3.mockReturnValue(connectedWeb3())
  })

  async function waitForLoadedBalance(ethPrefix = '10.0000') {
    await waitFor(() => {
      expect(
        screen.getByText((_, el) => {
          if (el?.tagName !== 'P') return false
          const text = el.textContent?.replace(/\s+/g, ' ') ?? ''
          return text.includes(`Your balance: ${ethPrefix}`)
        })
      ).toBeInTheDocument()
    })
  }

  it('prompts to connect wallet when disconnected', () => {
    mockUseWeb3.mockReturnValue({
      isConnected: false,
      account: null,
      signer: null,
      provider: null,
    })
    render(
      <BiddingInterface auction={baseAuction} onBidPlaced={onBidPlaced} isCreator={false} />
    )
    expect(screen.getByText(/connect your wallet to place a bid/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /place bid/i })).not.toBeInTheDocument()
  })

  it('blocks the creator from bidding', () => {
    render(
      <BiddingInterface auction={baseAuction} onBidPlaced={onBidPlaced} isCreator />
    )
    expect(
      screen.getByText(/you are the creator of this auction and cannot place bids/i)
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /place bid/i })).not.toBeInTheDocument()
  })

  it('shows English auction bid form with minimum and help text', async () => {
    render(
      <BiddingInterface auction={baseAuction} onBidPlaced={onBidPlaced} isCreator={false} />
    )
    expect(screen.getByLabelText(/bid amount \(eth\)/i)).toBeInTheDocument()
    expect(screen.getByText(/minimum bid:/i)).toBeInTheDocument()
    expect(screen.getByText(/english auction/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place bid/i })).toBeDisabled()
    await waitForLoadedBalance()
  })

  it('shows Dutch auction current-price guidance', async () => {
    render(
      <BiddingInterface
        auction={{
          ...baseAuction,
          type: 'DUTCH',
          currentPrice: '2000000000000000000',
          highestBid: null,
        }}
        onBidPlaced={onBidPlaced}
        isCreator={false}
      />
    )
    expect(screen.getByText(/dutch auction/i)).toBeInTheDocument()
    expect(screen.getByText(/price decreases over time/i)).toBeInTheDocument()
    await waitForLoadedBalance()
  })

  it('shows sealed bid guidance', async () => {
    render(
      <BiddingInterface
        auction={{ ...baseAuction, type: 'SEALED_BID', highestBid: null }}
        onBidPlaced={onBidPlaced}
        isCreator={false}
      />
    )
    expect(screen.getByText(/sealed bid/i)).toBeInTheDocument()
    expect(screen.getByText(/hidden until the reveal phase/i)).toBeInTheDocument()
    await waitForLoadedBalance()
  })

  it('renders order book buy/sell controls', async () => {
    render(
      <BiddingInterface
        auction={{ ...baseAuction, type: 'ORDER_BOOK', highestBid: null }}
        onBidPlaced={onBidPlaced}
        isCreator={false}
      />
    )
    expect(screen.getByRole('button', { name: /^buy$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sell$/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/price \(eth per unit\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount \(units\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place buy order/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /^sell$/i }))
    expect(screen.getByRole('button', { name: /place sell order/i })).toBeInTheDocument()
    await waitForLoadedBalance()
  })

  it('toasts when English bid is not above the minimum', async () => {
    render(
      <BiddingInterface auction={baseAuction} onBidPlaced={onBidPlaced} isCreator={false} />
    )
    await waitForLoadedBalance()
    // Min is 1.05 ETH (highest * 1.05); bid at or below fails
    fireEvent.change(screen.getByLabelText(/bid amount \(eth\)/i), {
      target: { value: '1.05' },
    })
    fireEvent.click(screen.getByRole('button', { name: /place bid/i }))
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/bid must be higher than/i))
    expect(onBidPlaced).not.toHaveBeenCalled()
  })

  it('toasts on insufficient balance', async () => {
    mockUseWeb3.mockReturnValue(
      connectedWeb3({
        provider: {
          getBalance: jest.fn().mockResolvedValue(BigInt('100000000000000000')), // 0.1 ETH
        },
      })
    )
    render(
      <BiddingInterface auction={baseAuction} onBidPlaced={onBidPlaced} isCreator={false} />
    )
    await waitForLoadedBalance('0.1000')
    fireEvent.change(screen.getByLabelText(/bid amount \(eth\)/i), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /place bid/i }))
    expect(toast.error).toHaveBeenCalledWith('Insufficient balance')
  })

  it('places bid via API when no contract is deployed', async () => {
    mockApiRequest.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'bid-1' }),
    })

    render(
      <BiddingInterface auction={baseAuction} onBidPlaced={onBidPlaced} isCreator={false} />
    )
    await waitForLoadedBalance()
    fireEvent.change(screen.getByLabelText(/bid amount \(eth\)/i), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /place bid/i }))

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/auctions/auc-1/bids'),
        expect.objectContaining({ method: 'POST' }),
        expect.anything(),
        ACCOUNT
      )
    })
    await waitFor(() => expect(onBidPlaced).toHaveBeenCalled())
  })

  it('requires a deployed contract for order book bids', async () => {
    render(
      <BiddingInterface
        auction={{ ...baseAuction, type: 'ORDER_BOOK', contractAddress: null }}
        onBidPlaced={onBidPlaced}
        isCreator={false}
      />
    )
    await waitForLoadedBalance()
    fireEvent.change(screen.getByLabelText(/price \(eth per unit\)/i), {
      target: { value: '0.1' },
    })
    fireEvent.change(screen.getByLabelText(/amount \(units\)/i), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /place buy order/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Order book requires a deployed contract')
    })
    expect(onBidPlaced).not.toHaveBeenCalled()
  })

  it('shows hold-to-compete and random-selection help text', async () => {
    const { rerender } = render(
      <BiddingInterface
        auction={{ ...baseAuction, type: 'HOLD_TO_COMPETE', highestBid: null }}
        onBidPlaced={onBidPlaced}
        isCreator={false}
      />
    )
    expect(screen.getByText(/hold to compete/i)).toBeInTheDocument()
    await waitForLoadedBalance()

    rerender(
      <BiddingInterface
        auction={{ ...baseAuction, type: 'RANDOM_SELECTION', highestBid: null }}
        onBidPlaced={onBidPlaced}
        isCreator={false}
      />
    )
    expect(screen.getByText(/random selection/i)).toBeInTheDocument()
    await waitForLoadedBalance()
  })
})
