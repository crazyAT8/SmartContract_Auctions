'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import AuctionTypeSelector from '@/components/AuctionTypeSelector'
import EnglishAuction from '@/components/auctions/EnglishAuction'
import DutchAuction from '@/components/auctions/DutchAuction'
import SealedBidAuction from '@/components/auctions/SealedBidAuction'
import { AuctionType } from '@/lib/types'

// Mock contract addresses - replace with actual deployed addresses
const MOCK_CONTRACTS = {
  english: '0x1234567890123456789012345678901234567890',
  dutch: '0x2345678901234567890123456789012345678901',
  'sealed-bid': '0x3456789012345678901234567890123456789012',
  'hold-to-compete': '0x4567890123456789012345678901234567890123',
  'order-book': '0x5678901234567890123456789012345678901234',
  playable: '0x6789012345678901234567890123456789012345',
  'random-selection': '0x7890123456789012345678901234567890123456'
}

export default function Home() {
  const [selectedAuctionType, setSelectedAuctionType] = useState<AuctionType | null>(null)
  const [showTypeSelector, setShowTypeSelector] = useState(true)

  const handleSelectType = (type: AuctionType) => {
    setSelectedAuctionType(type)
    setShowTypeSelector(false)
  }

  const handleBackToSelector = () => {
    setSelectedAuctionType(null)
    setShowTypeSelector(true)
  }

  const renderAuctionComponent = () => {
    if (!selectedAuctionType) return null

    const contractAddress = MOCK_CONTRACTS[selectedAuctionType]

    switch (selectedAuctionType) {
      case 'english':
        return <EnglishAuction contractAddress={contractAddress} />
      case 'dutch':
        return <DutchAuction contractAddress={contractAddress} />
      case 'sealed-bid':
        return <SealedBidAuction contractAddress={contractAddress} />
      case 'hold-to-compete':
        return <div className="text-center py-12">Hold to Compete Auction - Coming Soon!</div>
      case 'order-book':
        return <div className="text-center py-12">Order Book Auction - Coming Soon!</div>
      case 'playable':
        return <div className="text-center py-12">Playable Auction - Coming Soon!</div>
      case 'random-selection':
        return <div className="text-center py-12">Random Selection Auction - Coming Soon!</div>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="relative">
        <AnimatePresence mode="wait">
          {showTypeSelector ? (
            <motion.div
              key="selector"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AuctionTypeSelector onSelectType={handleSelectType} />
            </motion.div>
          ) : (
            <motion.div
              key="auction"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                  <button
                    onClick={handleBackToSelector}
                    className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back to Auction Types</span>
                  </button>
                </div>
                {renderAuctionComponent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>Built with ❤️ using Next.js, Wagmi, and RainbowKit</p>
            <p className="mt-2 text-sm">A comprehensive auction platform for the decentralized web</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
