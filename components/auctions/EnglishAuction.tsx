import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi'
import { parseEther, formatEther } from 'ethers'
import { Clock, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

interface EnglishAuctionProps {
  contractAddress: string
}

export default function EnglishAuction({ contractAddress }: EnglishAuctionProps) {
  const { address } = useAccount()
  const [bidAmount, setBidAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Contract reads
  const { data: auctionDetails } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: [
      "function getAuctionDetails() external view returns (address, uint, uint, address, bool)"
    ],
    functionName: 'getAuctionDetails',
    watch: true
  })

  const [seller, auctionEndTime, highestBid, highestBidder, ended] = auctionDetails || [null, 0, 0, null, false]

  // Contract writes
  const { write: placeBid, data: bidTx } = useContractWrite({
    address: contractAddress as `0x${string}`,
    abi: ["function bid() external payable"],
    functionName: 'bid',
    value: bidAmount ? parseEther(bidAmount) : undefined
  })

  const { write: withdraw } = useContractWrite({
    address: contractAddress as `0x${string}`,
    abi: ["function withdraw() external"],
    functionName: 'withdraw'
  })

  const { write: finalizeAuction } = useContractWrite({
    address: contractAddress as `0x${string}`,
    abi: ["function finalizeAuction() external"],
    functionName: 'finalizeAuction'
  })

  const { isLoading: isBidPending } = useWaitForTransaction({
    hash: bidTx?.hash
  })

  const handleBid = async () => {
    if (!bidAmount || !placeBid) return
    setIsLoading(true)
    try {
      await placeBid()
    } catch (error) {
      console.error('Bid failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isAuctionActive = auctionEndTime && Date.now() / 1000 < Number(auctionEndTime)
  const timeRemaining = auctionEndTime ? Math.max(0, Number(auctionEndTime) - Date.now() / 1000) : 0
  const hours = Math.floor(timeRemaining / 3600)
  const minutes = Math.floor((timeRemaining % 3600) / 60)
  const seconds = Math.floor(timeRemaining % 60)

  return (
    <motion.div
      className="max-w-4xl mx-auto p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="text-3xl">📈</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">English Auction</h2>
              <p className="text-gray-600">Traditional ascending bid auction</p>
            </div>
          </div>

          {/* Auction Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Time Remaining</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {isAuctionActive ? `${hours}h ${minutes}m ${seconds}s` : 'Ended'}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Highest Bid</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {highestBid ? `${formatEther(highestBid)} ETH` : 'No bids'}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Highest Bidder</span>
              </div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {highestBidder ? `${highestBidder.slice(0, 6)}...${highestBidder.slice(-4)}` : 'None'}
              </div>
            </div>
          </div>

          {/* Bidding Section */}
          {isAuctionActive && !ended && (
            <div className="bg-primary-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Your Bid</h3>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Bid amount in ETH"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleBid}
                  disabled={!bidAmount || isLoading || isBidPending}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading || isBidPending ? 'Processing...' : 'Place Bid'}
                </button>
              </div>
              {highestBid && (
                <p className="text-sm text-gray-600 mt-2">
                  Minimum bid: {formatEther(highestBid)} ETH
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            {address && (
              <button
                onClick={() => withdraw?.()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Withdraw Funds
              </button>
            )}
            
            {address === seller && !ended && !isAuctionActive && (
              <button
                onClick={() => finalizeAuction?.()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Finalize Auction
              </button>
            )}
          </div>

          {/* Status Messages */}
          {ended && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">Auction Completed</span>
              </div>
            </div>
          )}

          {!isAuctionActive && !ended && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-800 font-medium">Auction Time Expired</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
