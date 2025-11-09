'use client'

import { useState } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface FilterOptions {
  search: string
  type: string
  status: string
  sortBy: string
  sortOrder: string
}

interface AuctionFiltersProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
}

export function AuctionFilters({ filters, onFiltersChange }: AuctionFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleChange = (key: keyof FilterOptions, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      type: '',
      status: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
  }

  const hasActiveFilters = filters.type || filters.status || filters.search

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search auctions..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {filters.search && (
            <button
              onClick={() => handleChange('search', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Auction Type */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Auction Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="DUTCH">Dutch</option>
            <option value="ENGLISH">English</option>
            <option value="SEALED_BID">Sealed Bid</option>
            <option value="HOLD_TO_COMPETE">Hold-to-Compete</option>
            <option value="PLAYABLE">Playable</option>
            <option value="RANDOM_SELECTION">Random Selection</option>
            <option value="ORDER_BOOK">Order Book</option>
          </select>
        </div>

        {/* Status */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ENDED">Ended</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleChange('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="createdAt">Newest First</option>
            <option value="totalBids">Most Bids</option>
            <option value="currentPrice">Price</option>
            <option value="endTime">Ending Soon</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {filters.search && <span className="inline-block mr-3">Search: &quot;{filters.search}&quot;</span>}
            {filters.type && <span className="inline-block mr-3">Type: {filters.type}</span>}
            {filters.status && <span className="inline-block">Status: {filters.status}</span>}
          </p>
        </div>
      )}
    </div>
  )
}

