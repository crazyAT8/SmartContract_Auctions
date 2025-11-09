'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AuctionFilters } from '@/components/auctions/AuctionFilters'
import { AuctionCard } from '@/components/auctions/AuctionCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

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
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    type: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  const fetchAuctions = async () => {
    setLoading(true)
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
    } catch (error) {
      console.error('Error fetching auctions:', error)
      toast.error('Failed to load auctions')
      
      // Fallback to mock data for development
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
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
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
          endTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
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
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      setAuctions(mockAuctions)
      setPagination({
        page: 1,
        limit: 12,
        total: 3,
        pages: 1
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuctions()
  }, [currentPage, filters])

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">All Auctions</h1>
            <p className="text-xl text-gray-600">
              Discover and participate in decentralized auctions
            </p>
          </div>

          {/* Filters */}
          <AuctionFilters filters={filters} onFiltersChange={handleFiltersChange} />

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Auctions Grid */}
              {auctions.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                    {auctions.map((auction) => (
                      <AuctionCard key={auction.id} auction={auction} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.pages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        Previous
                      </button>
                      
                      <div className="px-4 py-2 text-gray-700">
                        Page {currentPage} of {pagination.pages}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                        disabled={currentPage === pagination.pages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No auctions found</p>
                  <p className="text-gray-400 mt-2">Try adjusting your filters</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}

