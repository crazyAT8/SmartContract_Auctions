'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSocket } from '@/contexts/SocketContext'
import { formatEther } from '@/utils/formatting'
import { CurrencyDollarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { ethers } from 'ethers'

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

export function BiddingInterface({ auction, onBidPlaced, isCreator }: BiddingInterfaceProps) {
  const { isConnected, account, signer, provider } = useWeb3()
  const { placeBid } = useSocket()
  const [bidAmount, setBidAmount] = useState('')
  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [balance, setBalance] = useState('0')

  useEffect(() => {
    if (account && provider) {
      provider.getBalance(account).then(bal => {
        setBalance(ethers.formatEther(bal))
      })
    }
  }, [account, provider])

  const getMinBid = () => {
    if (auction.type === 'DUTCH') {
      // For Dutch auctions, get current price
      return auction.currentPrice || auction.reservePrice || '0'
    }
    // For English auctions, need to bid higher than current highest
    if (auction.highestBid) {
      const current = parseFloat(auction.highestBid)
      return (current * 1.05).toString() // 5% increment minimum
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
    } else {
      if (bid <= minBid) {
        toast.error(`Bid must be higher than ${formatEther(minBid.toString())} ETH`)
        return false
      }
    }

    if (parseFloat(balance) < bid) {
      toast.error('Insufficient balance')
      return false
    }

    return true
  }

  const handlePlaceBid = async () => {
    if (!validateBid()) return

    setIsPlacingBid(true)

    try {
      // If contract address exists, interact with smart contract
      if (auction.contractAddress && signer) {
        await placeBidOnContract(auction.contractAddress, auction.type, bidAmount)
      } else {
        // Fallback to API-only bid (for testing)
        await placeBidViaAPI(bidAmount)
      }

      toast.success('Bid placed successfully!')
      setBidAmount('')
      onBidPlaced()
    } catch (error: any) {
      console.error('Error placing bid:', error)
      toast.error(error.message || 'Failed to place bid')
    } finally {
      setIsPlacingBid(false)
    }
  }

  const placeBidOnContract = async (contractAddress: string, type: string, amount: string) => {
    if (!signer) throw new Error('Wallet not connected')

    const value = ethers.parseEther(amount)

    // Basic contract ABI for common functions
    let contract: ethers.Contract
    let tx: ethers.ContractTransactionResponse

    switch (type) {
      case 'DUTCH':
        // Dutch auction - buy() function
        contract = new ethers.Contract(contractAddress, [
          'function buy() external payable'
        ], signer)
        tx = await contract.buy({ value })
        break

      case 'ENGLISH':
        // English auction - bid() function
        contract = new ethers.Contract(contractAddress, [
          'function bid() external payable'
        ], signer)
        tx = await contract.bid({ value })
        break

      default:
        // For other types, use API fallback
        return placeBidViaAPI(amount)
    }

    // Wait for transaction
    toast.loading('Waiting for transaction confirmation...', { id: 'tx-pending' })
    const receipt = await tx.wait()
    toast.success('Transaction confirmed!', { id: 'tx-pending' })

    // Also record bid in backend
    await placeBidViaAPI(amount, receipt.hash)
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

    // Emit socket event
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
                min={minBid}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={minBidFormatted}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500">
              Minimum bid: {minBidFormatted} ETH
              {auction.type === 'ENGLISH' && ' (must be higher than current highest bid)'}
            </p>
            <p className="text-xs text-gray-500">
              Your balance: {parseFloat(balance).toFixed(4)} ETH
            </p>
          </div>

          <button
            onClick={handlePlaceBid}
            disabled={isPlacingBid || !bidAmount || parseFloat(bidAmount) <= 0}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlacingBid ? 'Placing Bid...' : 'Place Bid'}
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
        </>
      )}
    </div>
  )
}

