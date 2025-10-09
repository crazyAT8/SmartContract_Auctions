'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatAddress, formatEther, formatTimeRemaining, formatAuctionType, getAuctionTypeColor, getAuctionStatusColor } from '@/utils/formatting'
import { ClockIcon, UserIcon, EyeIcon } from '@heroicons/react/24/outline'

interface Auction {
  id: string
  title: string
  description: string
  imageUrl?: string
  type: string
  status: string
  currentPrice?: string
  highestBid?: string
  totalBids: number
  creator: {
    address: string
    username?: string
  }
  startTime?: string
  endTime?: string
}

export function FeaturedAuctions() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now - replace with actual API call
    const mockAuctions: Auction[] = [
      {
        id: '1',
        title: 'Rare Digital Art Collection',
        description: 'A unique collection of digital art pieces from renowned artists.',
        imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop',
        type: 'ENGLISH',
        status: 'ACTIVE',
        currentPrice: '2.5',
        highestBid: '2.5',
        totalBids: 15,
        creator: {
          address: '0x1234567890123456789012345678901234567890',
          username: 'ArtCollector'
        },
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
      },
      {
        id: '2',
        title: 'Exclusive NFT Drop',
        description: 'Limited edition NFT collection with only 100 pieces available.',
        imageUrl: 'https://images.unsplash.com/photo-1634017839464-7c61a471b93e?w=400&h=300&fit=crop',
        type: 'DUTCH',
        status: 'ACTIVE',
        currentPrice: '1.8',
        totalBids: 8,
        creator: {
          address: '0x9876543210987654321098765432109876543210',
          username: 'NFTCreator'
        },
        endTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // 1 hour from now
      },
      {
        id: '3',
        title: 'Governance Token Sale',
        description: 'Exclusive sale for community members holding our governance tokens.',
        imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop',
        type: 'HOLD_TO_COMPETE',
        status: 'ACTIVE',
        currentPrice: '0.5',
        totalBids: 25,
        creator: {
          address: '0x1111111111111111111111111111111111111111',
          username: 'DAOGovernance'
        },
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // 3 hours from now
      }
    ]

    setTimeout(() => {
      setAuctions(mockAuctions)
      setLoading(false)
    }, 1000)
  }, [])

  const getTimeRemaining = (endTime?: string) => {
    if (!endTime) return 'Unknown'
    const now = new Date().getTime()
    const end = new Date(endTime).getTime()
    const seconds = Math.max(0, Math.floor((end - now) / 1000))
    return formatTimeRemaining(seconds)
  }

  if (loading) {
    return (
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Featured Auctions
            </h2>
            <p className="text-xl text-gray-600">
              Discover the most exciting auctions happening right now
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded mb-4" />
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-gray-200 rounded w-20" />
                  <div className="h-6 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Featured Auctions
          </h2>
          <p className="text-xl text-gray-600">
            Discover the most exciting auctions happening right now
          </p>
        </div>

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

              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                {auction.title}
              </h3>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {auction.description}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <UserIcon className="h-4 w-4 mr-2" />
                  <span>by {auction.creator.username || formatAddress(auction.creator.address)}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  <span>{getTimeRemaining(auction.endTime)} remaining</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <EyeIcon className="h-4 w-4 mr-2" />
                  <span>{auction.totalBids} bids</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-sm text-gray-500">Current Price</div>
                  <div className="text-xl font-bold text-primary-600">
                    {formatEther(auction.currentPrice || '0')} ETH
                  </div>
                </div>
                {auction.highestBid && (
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Highest Bid</div>
                    <div className="text-lg font-semibold text-gray-900">
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
