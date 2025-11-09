'use client'

import Link from 'next/link'
import { formatAddress, formatEther, formatTimeRemaining, formatAuctionType, getAuctionTypeColor, getAuctionStatusColor } from '@/utils/formatting'
import { ClockIcon, UserIcon, EyeIcon } from '@heroicons/react/24/outline'

interface AuctionCardProps {
  auction: {
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
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const getTimeRemaining = () => {
    if (!auction.endTime) return null
    const now = new Date().getTime()
    const end = new Date(auction.endTime).getTime()
    const seconds = Math.max(0, Math.floor((end - now) / 1000))
    return formatTimeRemaining(seconds)
  }

  const timeRemaining = getTimeRemaining()

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
      <div className="relative">
        <img
          src={auction.imageUrl || 'https://via.placeholder.com/400x300'}
          alt={auction.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getAuctionTypeColor(auction.type)}`}>
            {formatAuctionType(auction.type)}
          </span>
          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getAuctionStatusColor(auction.status)}`}>
            {auction.status}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">
          {auction.title}
        </h3>
        
        {auction.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {auction.description}
          </p>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <UserIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">
              by {auction.creator.username || formatAddress(auction.creator.address)}
            </span>
          </div>
          
          {timeRemaining && (
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{timeRemaining} remaining</span>
            </div>
          )}
          
          <div className="flex items-center text-sm text-gray-600">
            <EyeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{auction.totalBids} bids</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-500 mb-1">Current Price</div>
              <div className="text-2xl font-bold text-primary-600">
                {formatEther(auction.currentPrice || '0')} ETH
              </div>
            </div>
            {auction.highestBid && (
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Highest Bid</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatEther(auction.highestBid)} ETH
                </div>
              </div>
            )}
          </div>
        </div>

        <Link
          href={`/auctions/${auction.id}`}
          className="block w-full bg-primary-600 hover:bg-primary-700 text-white text-center py-3 px-4 rounded-lg font-semibold transition-colors duration-200"
        >
          View Auction
        </Link>
      </div>
    </div>
  )
}

