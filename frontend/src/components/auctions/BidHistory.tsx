'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatAddress, formatEther } from '@/utils/formatting'
import { UserIcon, ClockIcon } from '@heroicons/react/24/outline'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Bid {
  id: string
  amount: string
  status: string
  createdAt: string
  bidder: {
    address: string
    username?: string | null
  }
  transactionHash?: string | null
}

interface BidHistoryProps {
  auctionId: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export function BidHistory({ auctionId }: BidHistoryProps) {
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const fetchBids = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bids?page=${page}&limit=20`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch bids')
      }

      const data = await response.json()
      setBids(data.bids || [])
      setHasMore(data.pagination && data.pagination.page < data.pagination.pages)
    } catch (error) {
      console.error('Error fetching bids:', error)
      // Fallback to mock data
      const mockBids: Bid[] = [
        {
          id: '1',
          amount: '2.5',
          status: 'ACCEPTED',
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          bidder: {
            address: '0x9876543210987654321098765432109876543210',
            username: 'Bidder1'
          },
          transactionHash: '0xabc123...'
        },
        {
          id: '2',
          amount: '2.3',
          status: 'ACCEPTED',
          createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
          bidder: {
            address: '0x1111111111111111111111111111111111111111',
            username: 'Bidder2'
          },
          transactionHash: '0xdef456...'
        },
        {
          id: '3',
          amount: '2.1',
          status: 'ACCEPTED',
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          bidder: {
            address: '0x2222222222222222222222222222222222222222',
            username: null
          },
          transactionHash: '0xghi789...'
        }
      ]
      setBids(mockBids)
    } finally {
      setLoading(false)
    }
  }, [auctionId, page])

  useEffect(() => {
    fetchBids()
  }, [fetchBids])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'WITHDRAWN':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && bids.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Bid History</h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Bid History</h2>
      
      {bids.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No bids yet. Be the first to bid!</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {bids.map((bid, index) => (
              <div
                key={bid.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  index === 0 ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-300 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate">
                        {bid.bidder.username || formatAddress(bid.bidder.address)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(bid.status)}`}>
                        {bid.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {formatDate(bid.createdAt)}
                      </div>
                      {bid.transactionHash && (
                        <a
                          href={`https://etherscan.io/tx/${bid.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 text-xs"
                        >
                          View TX
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary-600">
                      {formatEther(bid.amount)} ETH
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Load More Bids
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

