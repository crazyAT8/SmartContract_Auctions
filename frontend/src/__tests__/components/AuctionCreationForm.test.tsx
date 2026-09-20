import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuctionCreationForm } from '@/components/auctions/AuctionCreationForm'
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

const ACCOUNT = '0x2222222222222222222222222222222222222222'

describe('AuctionCreationForm', () => {
  const onSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWeb3.mockReturnValue({
      account: ACCOUNT,
      signer: { signMessage: jest.fn() },
    })
  })

  it('lists all seven auction types on the first step', () => {
    render(<AuctionCreationForm onSuccess={onSuccess} />)
    expect(screen.getByText('Select Auction Type')).toBeInTheDocument()
    expect(screen.getByText('Dutch Auction')).toBeInTheDocument()
    expect(screen.getByText('English Auction')).toBeInTheDocument()
    expect(screen.getByText('Sealed Bid Auction')).toBeInTheDocument()
    expect(screen.getByText('Hold-to-Compete')).toBeInTheDocument()
    expect(screen.getByText('Playable Auction')).toBeInTheDocument()
    expect(screen.getByText('Random Selection')).toBeInTheDocument()
    expect(screen.getByText('Order Book')).toBeInTheDocument()
  })

  it('moves to details when a type is selected and can go back', () => {
    render(<AuctionCreationForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('English Auction'))
    expect(screen.getByText('English Auction Details')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter auction title')).toBeInTheDocument()
    expect(screen.getByText(/bidding time \(hours\)/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/back to type selection/i))
    expect(screen.getByText('Select Auction Type')).toBeInTheDocument()
  })

  it('shows sealed-bid specific fields', () => {
    render(<AuctionCreationForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('Sealed Bid Auction'))
    expect(screen.getByText(/two phases: bidding \(blind\) and reveal/i)).toBeInTheDocument()
    expect(screen.getByText(/reveal time \(hours\)/i)).toBeInTheDocument()
  })

  it('shows Dutch-specific fields', () => {
    render(<AuctionCreationForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('Dutch Auction'))
    expect(screen.getByText(/start price \(eth\)/i)).toBeInTheDocument()
    expect(screen.getByText(/price drop interval \(minutes\)/i)).toBeInTheDocument()
  })

  it('toasts when title is missing', () => {
    render(<AuctionCreationForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('English Auction'))
    fireEvent.click(screen.getByRole('button', { name: /create auction/i }))
    expect(toast.error).toHaveBeenCalledWith('Title is required')
    expect(mockApiRequest).not.toHaveBeenCalled()
  })

  it('validates Dutch start price must exceed reserve', () => {
    render(<AuctionCreationForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('Dutch Auction'))

    fireEvent.change(screen.getByPlaceholderText('Enter auction title'), {
      target: { value: 'My Dutch' },
    })
    // Start / reserve / duration / interval placeholders
    fireEvent.change(screen.getByPlaceholderText('10.0'), { target: { value: '1' } })
    fireEvent.change(screen.getByPlaceholderText('1.0'), { target: { value: '2' } })
    fireEvent.change(screen.getByPlaceholderText('24'), { target: { value: '24' } })
    fireEvent.change(screen.getByPlaceholderText('60'), { target: { value: '60' } })

    fireEvent.click(screen.getByRole('button', { name: /create auction/i }))
    expect(toast.error).toHaveBeenCalledWith('Start price must be greater than reserve price')
  })

  it('requires wallet connection before create', () => {
    mockUseWeb3.mockReturnValue({ account: null, signer: null })
    render(<AuctionCreationForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('Random Selection'))
    fireEvent.change(screen.getByPlaceholderText('Enter auction title'), {
      target: { value: 'Lottery' },
    })
    fireEvent.change(screen.getByPlaceholderText('48'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: /create auction/i }))
    expect(toast.error).toHaveBeenCalledWith(
      'Please connect your wallet to create an auction'
    )
  })

  it('submits English auction payload and calls onSuccess', async () => {
    mockApiRequest.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-auc-1' }),
    })

    render(<AuctionCreationForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('English Auction'))
    fireEvent.change(screen.getByPlaceholderText('Enter auction title'), {
      target: { value: 'Rare NFT' },
    })
    fireEvent.change(screen.getByPlaceholderText('24'), { target: { value: '24' } })
    fireEvent.change(screen.getByPlaceholderText('1.0'), { target: { value: '0.5' } })
    fireEvent.click(screen.getByRole('button', { name: /create auction/i }))

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.stringMatching(/\/auctions$/),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"type":"ENGLISH"'),
        }),
        expect.anything(),
        ACCOUNT
      )
    })

    const body = JSON.parse(mockApiRequest.mock.calls[0][1].body)
    expect(body.title).toBe('Rare NFT')
    expect(body.biddingTime).toBe(24 * 3600)
    expect(body.reservePrice).toBeTruthy()
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('new-auc-1'))
  })

  it('submits sealed bid with bidding and reveal times in seconds', async () => {
    mockApiRequest.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'sealed-1' }),
    })

    render(<AuctionCreationForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('Sealed Bid Auction'))
    fireEvent.change(screen.getByPlaceholderText('Enter auction title'), {
      target: { value: 'Sealed Item' },
    })
    fireEvent.change(screen.getByPlaceholderText('48'), { target: { value: '48' } })
    fireEvent.change(screen.getByPlaceholderText('24'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: /create auction/i }))

    await waitFor(() => expect(mockApiRequest).toHaveBeenCalled())
    const body = JSON.parse(mockApiRequest.mock.calls[0][1].body)
    expect(body.type).toBe('SEALED_BID')
    expect(body.biddingTime).toBe(48 * 3600)
    expect(body.revealTime).toBe(24 * 3600)
  })

  it('validates hold-to-compete token address', () => {
    render(<AuctionCreationForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('Hold-to-Compete'))
    fireEvent.change(screen.getByPlaceholderText('Enter auction title'), {
      target: { value: 'Token Gate' },
    })
    fireEvent.change(screen.getByPlaceholderText('0x...'), {
      target: { value: 'not-an-address' },
    })
    fireEvent.change(screen.getByPlaceholderText('100'), { target: { value: '10' } })
    fireEvent.change(screen.getByPlaceholderText('24'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: /create auction/i }))
    expect(toast.error).toHaveBeenCalledWith('Valid token address is required')
  })
})
