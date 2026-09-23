'use client'

import { useState, useEffect, useCallback } from 'react'
import { AuctionFilters } from '@/components/auctions/AuctionFilters'
import { AuctionCard } from '@/components/auctions/AuctionCard'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
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

interface FilterOptions {
  search: string
  type: string
  status: string
  sortBy: string
  sortOrder: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    type: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  const fetchAuctions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
      })

      const response = await fetch(`${API_BASE_URL}/auctions?${queryParams}`)

      if (!response.ok) {
        throw new Error('Failed to fetch auctions')
      }

      const data = await response.json()
      setAuctions(data.auctions || [])
      setPagination(data.pagination || null)
    } catch (err) {
      console.error('Error fetching auctions:', err)
      setAuctions([])
      setPagination(null)
      setError(getUserFriendlyError(err, 'Failed to load auctions'))
    } finally {
      setLoading(false)
    }
  }, [currentPage, filters])

  useEffect(() => {
    fetchAuctions()
  }, [fetchAuctions])

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">All Auctions</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Discover and participate in decentralized auctions
          </p>
        </div>

        <ErrorBoundary
          title="Filters failed"
          description="Could not render auction filters. Try refreshing the page."
        >
          <AuctionFilters filters={filters} onFiltersChange={handleFiltersChange} />
        </ErrorBoundary>

        <ErrorBoundary
          resetKeys={[currentPage, filters.search, filters.type, filters.status]}
          title="Auction list failed"
          description="Could not render the auction list. Try again."
        >
          <AsyncState
            loading={loading}
            error={error}
            onRetry={fetchAuctions}
            loadingLabel="Loading auctions..."
          >
            {auctions.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                  {auctions.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))}
                </div>

                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:bg-secondary-950 transition-colors"
                    >
                      Previous
                    </button>

                    <div className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      Page {currentPage} of {pagination.pages}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                      disabled={currentPage === pagination.pages}
                      className="px-4 py-2 border border-gray-300 dark:border-secondary-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:bg-secondary-950 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">No auctions found</p>
                <p className="text-gray-400 mt-2">Try adjusting your filters</p>
              </div>
            )}
          </AsyncState>
        </ErrorBoundary>
      </div>
    </div>
  )
}
