'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatAddress, formatEther, formatTimeRemaining, formatAuctionType, getAuctionTypeColor, getAuctionStatusColor } from '@/utils/formatting'
import { ClockIcon, UserIcon, EyeIcon } from '@heroicons/react/24/outline'
import { AsyncState } from '@/components/ui/AsyncState'
import { getUserFriendlyError } from '@/utils/errors'

interface Auction {
  id: string
  title: string
  description: string | null
  imageUrl?: string | null
  type: string
  status: string
  currentPrice?: string | null
  highestBid?: string | null
  totalBids: number
  creator: {
    address: string
    username?: string | null
  }
  startTime?: string | null
  endTime?: string | null
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export function FeaturedAuctions() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeatured = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `${API_BASE_URL}/auctions?status=ACTIVE&sortBy=totalBids&sortOrder=desc&limit=3`
      )
      if (!response.ok) {
        throw new Error('Failed to load featured auctions')
      }
      const data = await response.json()
      setAuctions(data.auctions || [])
    } catch (err) {
      console.error('Error fetching featured auctions:', err)
      setAuctions([])
      setError(getUserFriendlyError(err, 'Failed to load featured auctions'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeatured()
  }, [fetchFeatured])

  const getTimeRemaining = (endTime?: string | null) => {
    if (!endTime) return 'Unknown'
    const now = new Date().getTime()
    const end = new Date(endTime).getTime()
    const seconds = Math.max(0, Math.floor((end - now) / 1000))
    return formatTimeRemaining(seconds)
  }

  return (
    <section className="py-24 bg-gray-50 dark:bg-secondary-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Featured Auctions
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Discover the most exciting auctions happening right now
          </p>
        </div>

        <AsyncState
          loading={loading}
          error={error}
          onRetry={fetchFeatured}
          loadingLabel="Loading featured auctions..."
        >
          {auctions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No active auctions yet.</p>
              <Link href="/create" className="btn-primary mt-4 inline-block">
                Create an auction
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {auctions.map((auction) => (
                <div key={auction.id} className="card hover:shadow-lg transition-shadow duration-300">
                  <div className="relative">
                    <img
                      src={auction.imageUrl || 'https://via.placeholder.com/400x300'}
                      alt={auction.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                    <div className="absolute top-2 left-2">
                      <span className={`badge ${getAuctionTypeColor(auction.type)}`}>
                        {formatAuctionType(auction.type)}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className={`badge ${getAuctionStatusColor(auction.status)}`}>
                        {auction.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-1">
                    {auction.title}
                  </h3>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {auction.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <UserIcon className="h-4 w-4 mr-2" />
                      <span>by {auction.creator.username || formatAddress(auction.creator.address)}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      <span>{getTimeRemaining(auction.endTime)} remaining</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <EyeIcon className="h-4 w-4 mr-2" />
                      <span>{auction.totalBids} bids</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Current Price</div>
                      <div className="text-xl font-bold text-primary-600">
                        {formatEther(auction.currentPrice || '0')} ETH
                      </div>
                    </div>
                    {auction.highestBid && (
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Highest Bid</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatEther(auction.highestBid)} ETH
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/auctions/${auction.id}`}
                    className="btn-primary w-full text-center"
                  >
                    View Auction
                  </Link>
                </div>
              ))}
            </div>
          )}
        </AsyncState>

        <div className="text-center mt-12">
          <Link
            href="/auctions"
            className="btn-outline btn-lg"
          >
            View All Auctions
          </Link>
        </div>
      </div>
    </section>
  )
}
