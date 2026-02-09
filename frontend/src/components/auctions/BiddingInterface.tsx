'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSocket } from '@/contexts/SocketContext'
import { formatEther } from '@/utils/formatting'
import { CurrencyDollarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { ethers } from 'ethers'
import { getAuctionABI, type AuctionType } from '@/contracts/contracts'

interface BiddingInterfaceProps {
  auction: {
    id: string
    type: string
    status: string
    contractAddress?: string | null
    currentPrice?: string | null
    highestBid?: string | null
    reservePrice?: string | null
    startPrice?: string | null
  }
  onBidPlaced: () => void
  isCreator: boolean
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const SEALED_BID_STORAGE_KEY = 'sealedBidReveal'

function storeSealedBidForReveal(auctionId: string, account: string, valueWei: string, secret: string) {
  try {
    const key = `${SEALED_BID_STORAGE_KEY}_${auctionId}_${account}`
    const data = JSON.stringify({ valueWei, secret })
    sessionStorage.setItem(key, data)
  } catch {
    // ignore
  }
}

export function BiddingInterface({ auction, onBidPlaced, isCreator }: BiddingInterfaceProps) {
  const { isConnected, account, signer, provider } = useWeb3()
  const { placeBid } = useSocket()
  const [bidAmount, setBidAmount] = useState('')
  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [balance, setBalance] = useState('0')

  // Order book specific state
  const [orderBookSide, setOrderBookSide] = useState<'buy' | 'sell'>('buy')
  const [orderBookPrice, setOrderBookPrice] = useState('')
  const [orderBookAmount, setOrderBookAmount] = useState('')

  useEffect(() => {
    if (account && provider) {
      provider.getBalance(account).then(bal => {
        setBalance(ethers.formatEther(bal))
      })
    }
  }, [account, provider])

  const isOrderBook = auction.type === 'ORDER_BOOK'

  const getMinBid = () => {
    if (auction.type === 'DUTCH') {
      return auction.currentPrice || auction.reservePrice || '0'
    }
    if (auction.type === 'ENGLISH' || auction.type === 'PLAYABLE' || auction.type === 'HOLD_TO_COMPETE') {
      if (auction.highestBid) {
        const current = parseFloat(auction.highestBid)
        return (current * 1.05).toString()
      }
      if (auction.type === 'PLAYABLE' && auction.currentPrice) return auction.currentPrice
      return auction.reservePrice || auction.startPrice || '0'
    }
    if (auction.type === 'RANDOM_SELECTION' || auction.type === 'SEALED_BID') {
      return auction.reservePrice || auction.startPrice || '0'
    }
    return auction.reservePrice || auction.startPrice || '0'
  }

  const validateBid = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet')
      return false
    }

    if (isCreator) {
      toast.error('You cannot bid on your own auction')
      return false
    }

    if (isOrderBook) {
      const price = parseFloat(orderBookPrice)
      const amount = parseFloat(orderBookAmount)
      if (!orderBookPrice || price <= 0 || !orderBookAmount || amount <= 0) {
        toast.error('Please enter valid price and amount')
        return false
      }
      if (orderBookSide === 'buy') {
        const valueWei = ethers.parseEther(orderBookPrice) * BigInt(Math.floor(amount))
        if (parseFloat(balance) < Number(ethers.formatEther(valueWei))) {
          toast.error('Insufficient balance for buy order')
          return false
        }
      }
      return true
    }

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      toast.error('Please enter a valid bid amount')
      return false
    }

    const minBid = parseFloat(getMinBid())
    const bid = parseFloat(bidAmount)

    if (auction.type === 'DUTCH') {
      if (bid < minBid) {
        toast.error(`Bid must be at least ${formatEther(minBid.toString())} ETH (current price)`)
        return false
      }
    } else if (auction.type !== 'SEALED_BID' && auction.type !== 'RANDOM_SELECTION') {
      if (bid <= minBid) {
        toast.error(`Bid must be higher than ${formatEther(minBid.toString())} ETH`)
        return false
      }
    }

    if (parseFloat(balance) < bid && (auction.type !== 'HOLD_TO_COMPETE' || !auction.contractAddress)) {
      toast.error('Insufficient balance')
      return false
    }

    return true
  }

  const handlePlaceBid = async () => {
    if (!validateBid()) return

    setIsPlacingBid(true)

    try {
      if (auction.contractAddress && signer) {
        await placeBidOnContract(auction.contractAddress, auction.type as AuctionType)
      } else {
        if (isOrderBook) {
          toast.error('Order book requires a deployed contract')
          setIsPlacingBid(false)
          return
        }
        await placeBidViaAPI(bidAmount)
      }

      toast.success('Bid placed successfully!')
      setBidAmount('')
      setOrderBookPrice('')
      setOrderBookAmount('')
      onBidPlaced()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to place bid'
      console.error('Error placing bid:', error)
      toast.error(msg)
    } finally {
      setIsPlacingBid(false)
    }
  }

  const placeBidOnContract = async (contractAddress: string, type: AuctionType) => {
    if (!signer) throw new Error('Wallet not connected')

    const abi = getAuctionABI(type)
    if (!abi) {
      return placeBidViaAPI(bidAmount)
    }

    const contract = new ethers.Contract(contractAddress, abi, signer)

    let tx: ethers.ContractTransactionResponse

    switch (type) {
      case 'DUTCH': {
        const value = ethers.parseEther(bidAmount)
        tx = await contract.buy({ value })
        break
      }
      case 'ENGLISH': {
        const value = ethers.parseEther(bidAmount)
        tx = await contract.bid({ value })
        break
      }
      case 'SEALED_BID': {
        const valueWei = ethers.parseEther(bidAmount)
        const secret = ethers.hexlify(ethers.randomBytes(32))
        // Match Solidity: keccak256(abi.encodePacked(_value, _secret))
        const packed = ethers.concat([
          ethers.toBeHex(valueWei, 32),
          secret,
        ])
        const blindedBid = ethers.keccak256(packed)
        tx = await contract.bid(blindedBid, { value: valueWei })
        if (account) storeSealedBidForReveal(auction.id, account, valueWei.toString(), secret)
        break
      }
      case 'HOLD_TO_COMPETE': {
        const amountWei = ethers.parseEther(bidAmount)
        tx = await contract.placeBid(amountWei)
        break
      }
      case 'PLAYABLE':
      case 'RANDOM_SELECTION': {
        const value = ethers.parseEther(bidAmount)
        tx = await contract.placeBid({ value })
        break
      }
      case 'ORDER_BOOK': {
        const priceWei = ethers.parseEther(orderBookPrice)
        const amountUnits = BigInt(Math.floor(parseFloat(orderBookAmount)))
        if (orderBookSide === 'buy') {
          const valueWei = priceWei * amountUnits
          tx = await contract.placeBuyOrder(priceWei, amountUnits, { value: valueWei })
        } else {
          tx = await contract.placeSellOrder(priceWei, amountUnits)
        }
        break
      }
      default:
        return placeBidViaAPI(bidAmount)
    }

    toast.loading('Waiting for transaction confirmation...', { id: 'tx-pending' })
    const receipt = await tx.wait()
    toast.success('Transaction confirmed!', { id: 'tx-pending' })

    const amountForApi = isOrderBook
      ? (orderBookSide === 'buy'
          ? ethers.formatEther(ethers.parseEther(orderBookPrice) * BigInt(Math.floor(parseFloat(orderBookAmount))))
          : '0')
      : bidAmount
    await placeBidViaAPI(amountForApi, receipt.hash)
  }

  const placeBidViaAPI = async (amount: string, txHash?: string) => {
    const response = await fetch(`${API_BASE_URL}/auctions/${auction.id}/bids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: ethers.parseEther(amount).toString(),
        transactionHash: txHash,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to place bid')
    }

    if (account) {
      placeBid({
        auctionId: auction.id,
        amount,
        bidderId: account,
      })
    }
  }

  const minBid = getMinBid()
  const minBidFormatted = formatEther(minBid)

  const canSubmitOrderBook = orderBookPrice && parseFloat(orderBookPrice) > 0 && orderBookAmount && parseFloat(orderBookAmount) > 0
  const canSubmitBid = bidAmount && parseFloat(bidAmount) > 0
  const canSubmit = isOrderBook ? canSubmitOrderBook : canSubmitBid

  return (
    <div className="space-y-4">
      {!isConnected ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              Connect your wallet to place a bid
            </p>
          </div>
        </div>
      ) : isCreator ? (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            You are the creator of this auction and cannot place bids.
          </p>
        </div>
      ) : (
        <>
          {isOrderBook ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Side</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderBookSide('buy')}
                    className={`flex-1 py-2 px-3 rounded-lg border ${orderBookSide === 'buy' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderBookSide('sell')}
                    className={`flex-1 py-2 px-3 rounded-lg border ${orderBookSide === 'sell' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300'}`}
                  >
                    Sell
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="obPrice" className="block text-sm font-medium text-gray-700">Price (ETH per unit)</label>
                <input
                  id="obPrice"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={orderBookPrice}
                  onChange={(e) => setOrderBookPrice(e.target.value)}
                  placeholder="0.0"
                  className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="obAmount" className="block text-sm font-medium text-gray-700">Amount (units)</label>
                <input
                  id="obAmount"
                  type="number"
                  step="1"
                  min="1"
                  value={orderBookAmount}
                  onChange={(e) => setOrderBookAmount(e.target.value)}
                  placeholder="0"
                  className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {orderBookSide === 'buy' && orderBookPrice && orderBookAmount && (
                <p className="text-xs text-gray-500">
                  Total: {formatEther((ethers.parseEther(orderBookPrice) * BigInt(Math.floor(parseFloat(orderBookAmount) || 0))).toString())} ETH
                </p>
              )}
              <p className="text-xs text-gray-500">Your balance: {parseFloat(balance).toFixed(4)} ETH</p>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">
                Bid Amount (ETH)
              </label>
              <div className="relative">
                <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="bidAmount"
                  type="number"
                  step="0.001"
                  min={auction.type === 'DUTCH' ? minBid : undefined}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={minBidFormatted}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500">
                Minimum bid: {minBidFormatted} ETH
                {auction.type === 'ENGLISH' && ' (must be higher than current highest bid)'}
                {(auction.type === 'PLAYABLE' || auction.type === 'HOLD_TO_COMPETE') && ' (must be higher than current highest)'}
              </p>
              <p className="text-xs text-gray-500">
                Your balance: {parseFloat(balance).toFixed(4)} ETH
              </p>
            </div>
          )}

          <button
            onClick={handlePlaceBid}
            disabled={isPlacingBid || !canSubmit}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlacingBid ? 'Placing Bid...' : isOrderBook ? (orderBookSide === 'buy' ? 'Place Buy Order' : 'Place Sell Order') : 'Place Bid'}
          </button>

          {auction.type === 'DUTCH' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Dutch Auction:</strong> The price decreases over time. Your bid will be accepted at the current price.
              </p>
            </div>
          )}

          {auction.type === 'ENGLISH' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>English Auction:</strong> Your bid must be higher than the current highest bid. Previous bidders can withdraw their bids.
              </p>
            </div>
          )}

          {auction.type === 'SEALED_BID' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Sealed Bid:</strong> Your bid is hidden until the reveal phase. Deposit the same amount you intend to bid. Save your reveal data for the reveal phase.
              </p>
            </div>
          )}

          {auction.type === 'HOLD_TO_COMPETE' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Hold to Compete:</strong> Bid with the auction&apos;s bidding token. Ensure you have approved the contract to spend your tokens.
              </p>
            </div>
          )}

          {auction.type === 'PLAYABLE' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Playable Auction:</strong> Place a bid in ETH. Price may vary; your bid must meet the current requirements.
              </p>
            </div>
          )}

          {auction.type === 'RANDOM_SELECTION' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Random Selection:</strong> All valid bids enter a pool; a winner is chosen at random when the auction ends.
              </p>
            </div>
          )}

          {auction.type === 'ORDER_BOOK' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Order Book:</strong> Place buy or sell orders at your chosen price and quantity. Buy orders require ETH; sell orders use your locked tokens.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
