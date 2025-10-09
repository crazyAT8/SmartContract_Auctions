import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi'
import { parseEther, formatEther } from 'ethers'
import { Lock, Eye, EyeOff, Clock, AlertCircle } from 'lucide-react'

interface SealedBidAuctionProps {
  contractAddress: string
}

export default function SealedBidAuction({ contractAddress }: SealedBidAuctionProps) {
  const { address } = useAccount()
  const [bidAmount, setBidAmount] = useState('')
  const [secret, setSecret] = useState('')
  const [revealAmount, setRevealAmount] = useState('')
  const [revealSecret, setRevealSecret] = useState('')
  const [phase, setPhase] = useState<'bidding' | 'reveal' | 'ended'>('bidding')
  const [isLoading, setIsLoading] = useState(false)

  // Contract writes
  const { write: submitBid, data: bidTx } = useContractWrite({
    address: contractAddress as `0x${string}`,
    abi: ["function bid(bytes32 _blindedBid) external payable"],
    functionName: 'bid',
    value: bidAmount ? parseEther(bidAmount) : undefined
  })

  const { write: revealBid, data: revealTx } = useContractWrite({
    address: contractAddress as `0x${string}`,
    abi: ["function reveal(uint256 _value, bytes32 _secret) external"],
    functionName: 'reveal'
  })

  const { write: endAuction } = useContractWrite({
    address: contractAddress as `0x${string}`,
    abi: ["function endAuction() external"],
    functionName: 'endAuction'
  })

  const { write: withdraw } = useContractWrite({
    address: contractAddress as `0x${string}`,
    abi: ["function withdraw() external"],
    functionName: 'withdraw'
  })

  const { isLoading: isBidPending } = useWaitForTransaction({
    hash: bidTx?.hash
  })

  const { isLoading: isRevealPending } = useWaitForTransaction({
    hash: revealTx?.hash
  })

  const generateBlindedBid = (value: string, secret: string) => {
    const { ethers } = require('ethers')
    return ethers.keccak256(ethers.solidityPacked(['uint256', 'bytes32'], [parseEther(value), ethers.id(secret)]))
  }

  const handleSubmitBid = async () => {
    if (!bidAmount || !secret || !submitBid) return
    setIsLoading(true)
    try {
      const blindedBid = generateBlindedBid(bidAmount, secret)
      await submitBid({ args: [blindedBid] })
    } catch (error) {
      console.error('Bid submission failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevealBid = async () => {
    if (!revealAmount || !revealSecret || !revealBid) return
    setIsLoading(true)
    try {
      await revealBid({ 
        args: [parseEther(revealAmount), ethers.id(revealSecret)] 
      })
    } catch (error) {
      console.error('Bid reveal failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
            <div className="text-3xl">🔒</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sealed Bid Auction</h2>
              <p className="text-gray-600">Two-phase confidential bidding</p>
            </div>
          </div>

          {/* Phase Indicator */}
          <div className="flex items-center space-x-4 mb-8">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
              phase === 'bidding' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <Lock className="h-4 w-4" />
              <span className="font-medium">Bidding Phase</span>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
              phase === 'reveal' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <Eye className="h-4 w-4" />
              <span className="font-medium">Reveal Phase</span>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
              phase === 'ended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <Clock className="h-4 w-4" />
              <span className="font-medium">Ended</span>
            </div>
          </div>

          {/* Bidding Phase */}
          {phase === 'bidding' && (
            <motion.div
              className="bg-blue-50 rounded-lg p-6 mb-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Secret Bid</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bid Amount (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Enter your bid amount"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secret Phrase
                  </label>
                  <input
                    type="text"
                    placeholder="Enter a secret phrase"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSubmitBid}
                  disabled={!bidAmount || !secret || isLoading || isBidPending}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading || isBidPending ? 'Submitting...' : 'Submit Secret Bid'}
                </button>
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Important:</p>
                    <p>Remember your secret phrase! You'll need it to reveal your bid later.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Reveal Phase */}
          {phase === 'reveal' && (
            <motion.div
              className="bg-green-50 rounded-lg p-6 mb-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reveal Your Bid</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bid Amount (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Enter the same bid amount"
                    value={revealAmount}
                    onChange={(e) => setRevealAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secret Phrase
                  </label>
                  <input
                    type="text"
                    placeholder="Enter the same secret phrase"
                    value={revealSecret}
                    onChange={(e) => setRevealSecret(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleRevealBid}
                  disabled={!revealAmount || !revealSecret || isLoading || isRevealPending}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading || isRevealPending ? 'Revealing...' : 'Reveal Bid'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            {address && (
              <button
                onClick={() => withdraw?.()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Withdraw Deposit
              </button>
            )}
            
            {phase === 'ended' && (
              <button
                onClick={() => endAuction?.()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                End Auction
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">How Sealed Bid Auctions Work</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <p>Submit a secret bid with a deposit during the bidding phase</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <p>Reveal your bid using the same amount and secret phrase</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <p>Highest valid bid wins, others get their deposits back</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
