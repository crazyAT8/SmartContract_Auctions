'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuctionDetails } from '@/components/auctions/AuctionDetails'
import { BiddingInterface } from '@/components/auctions/BiddingInterface'
import { BidHistory } from '@/components/auctions/BidHistory'
import { useWeb3 } from '@/contexts/Web3Context'
import { useSocket } from '@/contexts/SocketContext'
import toast from 'react-hot-toast'
import { formatAddress, formatEther, formatTimeRemaining, formatAuctionType, getAuctionTypeColor, getAuctionStatusColor } from '@/utils/formatting'
import { ClockIcon, UserIcon, CurrencyDollarIcon, EyeIcon } from '@heroicons/react/24/outline'

interface Auction {
  id: string
  title: string
  description: string | null
  imageUrl?: string | null
  type: string
  status: string
  contractAddress?: string | null
  currentPrice?: string | null
  highestBid?: string | null
  highestBidder?: string | null
  winner?: string | null
  totalBids: number
  totalVolume: string
  creator: {
    id: string
    address: string
    username?: string | null
    avatar?: string | null
  }
  startTime?: string | null
  endTime?: string | null
  startPrice?: string | null
  reservePrice?: string | null
  duration?: number | null
  createdAt: string
  updatedAt: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function AuctionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isConnected, account } = useWeb3()
  const { joinAuction, leaveAuction, socket } = useSocket()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const auctionId = params.id as string

  const fetchAuction = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Auction not found')
          router.push('/auctions')
          return
        }
        throw new Error('Failed to fetch auction')
      }

      const data = await response.json()
      setAuction(data)
    } catch (error) {
      console.error('Error fetching auction:', error)
      toast.error('Failed to load auction details')
      
      // Fallback to mock data for development
      const mockAuction: Auction = {
        id: auctionId,
        title: 'Rare Digital Art Collection',
        description: 'A unique collection of digital art pieces from renowned artists. This exclusive auction features one-of-a-kind pieces that have never been seen before.',
        imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
        type: 'ENGLISH',
        status: 'ACTIVE',
        contractAddress: '0x1234567890123456789012345678901234567890',
        currentPrice: '2.5',
        highestBid: '2.5',
        highestBidder: '0x9876543210987654321098765432109876543210',
        winner: null,
        totalBids: 15,
        totalVolume: '37.5',
        creator: {
          id: '1',
          address: '0x1234567890123456789012345678901234567890',
          username: 'ArtCollector'
        },
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        startPrice: '1.0',
        reservePrice: '0.5',
        duration: 14400,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      }
      setAuction(mockAuction)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [auctionId, router])

  useEffect(() => {
    fetchAuction()
  }, [fetchAuction])

  // Join auction room for real-time updates
  useEffect(() => {
    if (auction && socket) {
      joinAuction(auction.id)
      
      // Listen for auction updates
      socket.on('auction_state', (data) => {
        if (data.auctionId === auction.id) {
          setAuction(prev => prev ? { ...prev, ...data.updates } : null)
        }
      })

      socket.on('new_bid', (data) => {
        if (data.auctionId === auction.id) {
          setAuction(prev => {
            if (!prev) return null
            return {
              ...prev,
              totalBids: prev.totalBids + 1,
              highestBid: data.amount,
              highestBidder: data.bidder,
              currentPrice: data.amount,
              totalVolume: (parseFloat(prev.totalVolume) + parseFloat(data.amount)).toString()
            }
          })
        }
      })

      return () => {
        leaveAuction(auction.id)
        socket.off('auction_state')
        socket.off('new_bid')
      }
    }
  }, [auction, socket, joinAuction, leaveAuction])

  const handleBidPlaced = () => {
    // Refresh auction data after bid
    setRefreshing(true)
    fetchAuction()
  }

  const getTimeRemaining = () => {
    if (!auction?.endTime) return null
    const now = new Date().getTime()
    const end = new Date(auction.endTime).getTime()
    const seconds = Math.max(0, Math.floor((end - now) / 1000))
    return formatTimeRemaining(seconds)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner />
        </main>
        <Footer />
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-gray-500 text-lg mb-4">Auction not found</p>
            <button
              onClick={() => router.push('/auctions')}
              className="btn-primary"
            >
              Back to Auctions
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const timeRemaining = getTimeRemaining()
  const isCreator = account?.toLowerCase() === auction.creator.address.toLowerCase()
  const isEnded = auction.status === 'ENDED' || auction.status === 'CANCELLED'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 text-primary-600 hover:text-primary-700 flex items-center"
          >
            ← Back to Auctions
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Auction Image */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden relative h-96">
                <Image
                  src={auction.imageUrl || 'https://via.placeholder.com/800x600'}
                  alt={auction.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
                />
              </div>

              {/* Auction Details */}
              <AuctionDetails auction={auction} />

              {/* Bid History */}
              <BidHistory auctionId={auction.id} />
            </div>

            {/* Right Column - Bidding & Info */}
            <div className="space-y-6">
              {/* Auction Status Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{auction.title}</h2>
                  <span className={`badge ${getAuctionStatusColor(auction.status)}`}>
                    {auction.status}
                  </span>
                </div>

                <div className="mb-4">
                  <span className={`badge ${getAuctionTypeColor(auction.type)}`}>
                    {formatAuctionType(auction.type)}
                  </span>
                </div>

                {/* Key Stats */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div className="flex items-center text-gray-600">
                      <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                      <span>Current Price</span>
                    </div>
                    <div className="text-xl font-bold text-primary-600">
                      {formatEther(auction.currentPrice || '0')} ETH
                    </div>
                  </div>

                  {auction.highestBid && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div className="flex items-center text-gray-600">
                        <EyeIcon className="h-5 w-5 mr-2" />
                        <span>Highest Bid</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatEther(auction.highestBid)} ETH
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div className="flex items-center text-gray-600">
                      <EyeIcon className="h-5 w-5 mr-2" />
                      <span>Total Bids</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {auction.totalBids}
                    </div>
                  </div>

                  {timeRemaining && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div className="flex items-center text-gray-600">
                        <ClockIcon className="h-5 w-5 mr-2" />
                        <span>Time Remaining</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {timeRemaining}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center text-gray-600">
                      <UserIcon className="h-5 w-5 mr-2" />
                      <span>Creator</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {auction.creator.username || formatAddress(auction.creator.address)}
                    </div>
                  </div>
                </div>

                {/* Bidding Interface */}
                {!isEnded && (
                  <BiddingInterface
                    auction={auction}
                    onBidPlaced={handleBidPlaced}
                    isCreator={isCreator}
                  />
                )}

                {isEnded && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 text-sm mb-2">This auction has ended.</p>
                    {auction.winner && (
                      <p className="text-sm">
                        <span className="font-medium">Winner:</span>{' '}
                        {formatAddress(auction.winner)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Additional Info */}
              {auction.contractAddress && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Info</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Contract Address:</span>
                      <div className="font-mono text-gray-900 break-all">
                        {auction.contractAddress}
                      </div>
                    </div>
                    <a
                      href={`https://etherscan.io/address/${auction.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      View on Etherscan →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}

