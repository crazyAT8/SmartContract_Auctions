'use client'

import { formatAddress, formatEther } from '@/utils/formatting'
import { UserIcon, CalendarIcon, TagIcon } from '@heroicons/react/24/outline'

interface AuctionDetailsProps {
  auction: {
    id: string
    title: string
    description: string | null
    type: string
    status: string
    creator: {
      address: string
      username?: string | null
    }
    startTime?: string | null
    endTime?: string | null
    startPrice?: string | null
    reservePrice?: string | null
    duration?: number | null
    createdAt: string
    totalBids: number
    totalVolume: string
  }
}

export function AuctionDetails({ auction }: AuctionDetailsProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Auction Details</h2>
      
      {auction.description && (
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">{auction.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Creator */}
        <div className="flex items-start">
          <UserIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
          <div>
            <div className="text-sm text-gray-500 mb-1">Creator</div>
            <div className="font-medium text-gray-900">
              {auction.creator.username || formatAddress(auction.creator.address)}
            </div>
          </div>
        </div>

        {/* Auction Type */}
        <div className="flex items-start">
          <TagIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
          <div>
            <div className="text-sm text-gray-500 mb-1">Auction Type</div>
            <div className="font-medium text-gray-900">{auction.type}</div>
          </div>
        </div>

        {/* Start Time */}
        {auction.startTime && (
          <div className="flex items-start">
            <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 mb-1">Start Time</div>
              <div className="font-medium text-gray-900">{formatDate(auction.startTime)}</div>
            </div>
          </div>
        )}

        {/* End Time */}
        {auction.endTime && (
          <div className="flex items-start">
            <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 mb-1">End Time</div>
              <div className="font-medium text-gray-900">{formatDate(auction.endTime)}</div>
            </div>
          </div>
        )}

        {/* Duration */}
        {auction.duration && (
          <div className="flex items-start">
            <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 mb-1">Duration</div>
              <div className="font-medium text-gray-900">{formatDuration(auction.duration)}</div>
            </div>
          </div>
        )}

        {/* Start Price */}
        {auction.startPrice && (
          <div className="flex items-start">
            <TagIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 mb-1">Start Price</div>
              <div className="font-medium text-gray-900">{formatEther(auction.startPrice)} ETH</div>
            </div>
          </div>
        )}

        {/* Reserve Price */}
        {auction.reservePrice && (
          <div className="flex items-start">
            <TagIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 mb-1">Reserve Price</div>
              <div className="font-medium text-gray-900">{formatEther(auction.reservePrice)} ETH</div>
            </div>
          </div>
        )}

        {/* Total Volume */}
        <div className="flex items-start">
          <TagIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
          <div>
            <div className="text-sm text-gray-500 mb-1">Total Volume</div>
            <div className="font-medium text-gray-900">{formatEther(auction.totalVolume)} ETH</div>
          </div>
        </div>

        {/* Created */}
        <div className="flex items-start">
          <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
          <div>
            <div className="text-sm text-gray-500 mb-1">Created</div>
            <div className="font-medium text-gray-900">{formatDate(auction.createdAt)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

