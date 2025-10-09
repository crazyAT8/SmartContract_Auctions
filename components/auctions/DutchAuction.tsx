import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi'
import { parseEther, formatEther } from 'ethers'
import { Clock, TrendingDown, Zap, AlertCircle, CheckCircle } from 'lucide-react'

interface DutchAuctionProps {
  contractAddress: string
}

export default function DutchAuction({ contractAddress }: DutchAuctionProps) {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)

  // Contract reads
  const { data: currentPrice } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: ["function getCurrentPrice() public view returns (uint256)"],
    functionName: 'getCurrentPrice',
    watch: true
  })

  const { data: auctionDetails } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: [
      "function seller() public view returns (address)",
      "function startPrice() public view returns (uint256)",
      "function reservePrice() public view returns (uint256)",
      "function startTime() public view returns (uint256)",
      "function duration() public view returns (uint256)",
      "function ended() public view returns (bool)",
      "function winner() public view returns (address)"
    ],
    functionName: 'seller'
  })

  // Contract writes
  const { write: buy, data: buyTx } = useContractWrite({
    address: contractAddress as `0x${string}`,
    abi: ["function buy() external payable"],
    functionName: 'buy',
    value: currentPrice
  })

  const { isLoading: isBuyPending } = useWaitForTransaction({
    hash: buyTx?.hash
  })

  const handleBuy = async () => {
    if (!buy || !currentPrice) return
    setIsLoading(true)
    try {
      await buy()
    } catch (error) {
      console.error('Buy failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const price = currentPrice ? formatEther(currentPrice) : '0'
  const priceChange = currentPrice ? ((Number(formatEther(currentPrice)) - 1) / 1 * 100) : 0

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
            <div className="text-3xl">📉</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dutch Auction</h2>
              <p className="text-gray-600">Descending price auction - first to buy wins!</p>
            </div>
          </div>

          {/* Current Price Display */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-8 mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <TrendingDown className="h-6 w-6 text-primary-600" />
                <span className="text-lg font-medium text-gray-700">Current Price</span>
              </div>
              <div className="text-5xl font-bold text-primary-600 mb-2">
                {price} ETH
              </div>
              <div className="text-sm text-gray-600">
                Price drops automatically over time
              </div>
            </div>
          </div>

          {/* Price Chart Simulation */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Movement</h3>
            <div className="h-32 bg-white rounded border flex items-end justify-center space-x-1 p-4">
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={i}
                  className="bg-primary-200 rounded-t"
                  style={{
                    height: `${Math.max(10, 100 - i * 4)}%`,
                    width: '8px'
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>Start Price</span>
              <span>Current</span>
              <span>Reserve Price</span>
            </div>
          </div>

          {/* Buy Button */}
          <div className="text-center">
            <button
              onClick={handleBuy}
              disabled={!buy || isLoading || isBuyPending}
              className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading || isBuyPending ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="h-6 w-6" />
                  <span>Buy Now for {price} ETH</span>
                </div>
              )}
            </button>
            <p className="text-sm text-gray-600 mt-3">
              First person to buy at current price wins the auction
            </p>
          </div>

          {/* Auction Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">How it works</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Price starts high and drops over time</li>
                <li>• First person to buy wins</li>
                <li>• No bidding required</li>
                <li>• Instant execution</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Strategy Tips</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Wait for your target price</li>
                <li>• Be ready to act quickly</li>
                <li>• Monitor price drops</li>
                <li>• Don't wait too long!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
