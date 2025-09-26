'use client'

import { useWeb3 } from '@/contexts/Web3Context'
import Link from 'next/link'
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline'

export function Hero() {
  const { isConnected } = useWeb3()

  return (
    <div className="relative bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-800 text-sm font-medium">
              <SparklesIcon className="h-4 w-4 mr-2" />
              Decentralized Auction Platform
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Discover the Future of
            <span className="text-gradient block">Digital Auctions</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Experience 7 different auction mechanisms on the blockchain. From traditional English auctions to innovative Dutch and sealed bid systems.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isConnected ? (
              <>
                <Link
                  href="/auctions"
                  className="btn-primary btn-lg flex items-center justify-center"
                >
                  Browse Auctions
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </Link>
                <Link
                  href="/create"
                  className="btn-outline btn-lg"
                >
                  Create Auction
                </Link>
              </>
            ) : (
              <div className="text-center">
                <p className="text-lg text-gray-600 mb-4">
                  Connect your wallet to start participating in auctions
                </p>
                <div className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium">
                  Connect Wallet Required
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">7</div>
            <div className="text-gray-600">Auction Types</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">100%</div>
            <div className="text-gray-600">Decentralized</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">24/7</div>
            <div className="text-gray-600">Always Active</div>
          </div>
        </div>
      </div>
    </div>
  )
}
