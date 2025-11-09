'use client'

import { useState } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { formatAuctionType } from '@/utils/formatting'
import { 
  ClockIcon, 
  ArrowUpIcon, 
  EyeSlashIcon, 
  LockClosedIcon,
  SparklesIcon,
  GiftIcon,
  ChartBarIcon,
  PhotoIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { ethers } from 'ethers'

interface AuctionCreationFormProps {
  onSuccess: (auctionId: string) => void
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const AUCTION_TYPES = [
  { value: 'DUTCH', label: 'Dutch Auction', icon: ClockIcon, description: 'Price starts high and decreases over time' },
  { value: 'ENGLISH', label: 'English Auction', icon: ArrowUpIcon, description: 'Traditional ascending price auction' },
  { value: 'SEALED_BID', label: 'Sealed Bid Auction', icon: EyeSlashIcon, description: 'Two-phase blind bidding' },
  { value: 'HOLD_TO_COMPETE', label: 'Hold-to-Compete', icon: LockClosedIcon, description: 'Requires token locking before bidding' },
  { value: 'PLAYABLE', label: 'Playable Auction', icon: SparklesIcon, description: 'Gamified hybrid mechanism' },
  { value: 'RANDOM_SELECTION', label: 'Random Selection', icon: GiftIcon, description: 'Lottery-based winner selection' },
  { value: 'ORDER_BOOK', label: 'Order Book', icon: ChartBarIcon, description: 'Centralized order matching' },
]

interface FormData {
  // Common fields
  title: string
  description: string
  imageUrl: string
  type: string
  
  // Dutch auction
  startPrice: string
  reservePrice: string
  duration: string // in hours
  priceDropInterval: string // in minutes
  
  // English auction
  biddingTime: string // in hours
  reservePriceEnglish: string
  
  // Sealed bid
  biddingTimeSealed: string // in hours
  revealTime: string // in hours
  
  // Hold to compete
  minHoldAmount: string
  tokenAddress: string
  biddingTimeHold: string // in hours
  
  // Playable
  startPricePlayable: string
  reservePricePlayable: string
  durationPlayable: string // in hours
  
  // Random selection
  biddingTimeRandom: string // in hours
  
  // Order book
  biddingTimeOrderBook: string // in hours
}

export function AuctionCreationForm({ onSuccess }: AuctionCreationFormProps) {
  const { account, signer } = useWeb3()
  const [step, setStep] = useState<'type' | 'details' | 'review'>('type')
  const [selectedType, setSelectedType] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    imageUrl: '',
    type: '',
    startPrice: '',
    reservePrice: '',
    duration: '',
    priceDropInterval: '',
    biddingTime: '',
    reservePriceEnglish: '',
    biddingTimeSealed: '',
    revealTime: '',
    minHoldAmount: '',
    tokenAddress: '',
    biddingTimeHold: '',
    startPricePlayable: '',
    reservePricePlayable: '',
    durationPlayable: '',
    biddingTimeRandom: '',
    biddingTimeOrderBook: '',
  })

  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    setFormData(prev => ({ ...prev, type }))
    setStep('details')
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return false
    }

    if (formData.title.length > 200) {
      toast.error('Title must be less than 200 characters')
      return false
    }

    if (formData.description && formData.description.length > 1000) {
      toast.error('Description must be less than 1000 characters')
      return false
    }

    // Type-specific validation
    switch (formData.type) {
      case 'DUTCH':
        if (!formData.startPrice || parseFloat(formData.startPrice) <= 0) {
          toast.error('Start price is required and must be greater than 0')
          return false
        }
        if (!formData.reservePrice || parseFloat(formData.reservePrice) <= 0) {
          toast.error('Reserve price is required and must be greater than 0')
          return false
        }
        if (parseFloat(formData.startPrice) <= parseFloat(formData.reservePrice)) {
          toast.error('Start price must be greater than reserve price')
          return false
        }
        if (!formData.duration || parseFloat(formData.duration) <= 0) {
          toast.error('Duration is required')
          return false
        }
        if (!formData.priceDropInterval || parseFloat(formData.priceDropInterval) <= 0) {
          toast.error('Price drop interval is required')
          return false
        }
        break

      case 'ENGLISH':
        if (!formData.biddingTime || parseFloat(formData.biddingTime) <= 0) {
          toast.error('Bidding time is required')
          return false
        }
        if (!formData.reservePriceEnglish || parseFloat(formData.reservePriceEnglish) <= 0) {
          toast.error('Reserve price is required')
          return false
        }
        break

      case 'SEALED_BID':
        if (!formData.biddingTimeSealed || parseFloat(formData.biddingTimeSealed) <= 0) {
          toast.error('Bidding time is required')
          return false
        }
        if (!formData.revealTime || parseFloat(formData.revealTime) <= 0) {
          toast.error('Reveal time is required')
          return false
        }
        break

      case 'HOLD_TO_COMPETE':
        if (!formData.minHoldAmount || parseFloat(formData.minHoldAmount) <= 0) {
          toast.error('Minimum hold amount is required')
          return false
        }
        if (!formData.tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(formData.tokenAddress)) {
          toast.error('Valid token address is required')
          return false
        }
        if (!formData.biddingTimeHold || parseFloat(formData.biddingTimeHold) <= 0) {
          toast.error('Bidding time is required')
          return false
        }
        break

      case 'PLAYABLE':
        if (!formData.startPricePlayable || parseFloat(formData.startPricePlayable) <= 0) {
          toast.error('Start price is required')
          return false
        }
        if (!formData.reservePricePlayable || parseFloat(formData.reservePricePlayable) <= 0) {
          toast.error('Reserve price is required')
          return false
        }
        if (!formData.durationPlayable || parseFloat(formData.durationPlayable) <= 0) {
          toast.error('Duration is required')
          return false
        }
        break

      case 'RANDOM_SELECTION':
        if (!formData.biddingTimeRandom || parseFloat(formData.biddingTimeRandom) <= 0) {
          toast.error('Bidding time is required')
          return false
        }
        break

      case 'ORDER_BOOK':
        if (!formData.biddingTimeOrderBook || parseFloat(formData.biddingTimeOrderBook) <= 0) {
          toast.error('Bidding time is required')
          return false
        }
        break
    }

    return true
  }

  const prepareAuctionData = () => {
    const baseData: any = {
      title: formData.title,
      description: formData.description || null,
      imageUrl: formData.imageUrl || null,
      type: formData.type,
    }

    switch (formData.type) {
      case 'DUTCH':
        baseData.startPrice = ethers.parseEther(formData.startPrice).toString()
        baseData.reservePrice = ethers.parseEther(formData.reservePrice).toString()
        baseData.duration = Math.floor(parseFloat(formData.duration) * 3600) // Convert hours to seconds
        baseData.priceDropInterval = Math.floor(parseFloat(formData.priceDropInterval) * 60) // Convert minutes to seconds
        break

      case 'ENGLISH':
        baseData.biddingTime = Math.floor(parseFloat(formData.biddingTime) * 3600)
        baseData.reservePrice = ethers.parseEther(formData.reservePriceEnglish).toString()
        break

      case 'SEALED_BID':
        baseData.biddingTime = Math.floor(parseFloat(formData.biddingTimeSealed) * 3600)
        baseData.revealTime = Math.floor(parseFloat(formData.revealTime) * 3600)
        break

      case 'HOLD_TO_COMPETE':
        baseData.minHoldAmount = ethers.parseEther(formData.minHoldAmount).toString()
        baseData.tokenAddress = formData.tokenAddress
        baseData.biddingTime = Math.floor(parseFloat(formData.biddingTimeHold) * 3600)
        break

      case 'PLAYABLE':
        baseData.startPrice = ethers.parseEther(formData.startPricePlayable).toString()
        baseData.reservePrice = ethers.parseEther(formData.reservePricePlayable).toString()
        baseData.duration = Math.floor(parseFloat(formData.durationPlayable) * 3600)
        break

      case 'RANDOM_SELECTION':
        baseData.biddingTime = Math.floor(parseFloat(formData.biddingTimeRandom) * 3600)
        break

      case 'ORDER_BOOK':
        baseData.biddingTime = Math.floor(parseFloat(formData.biddingTimeOrderBook) * 3600)
        break
    }

    return baseData
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const auctionData = prepareAuctionData()

      // For now, we'll use regular fetch - authentication can be added later
      // when the backend auth endpoint is implemented
      const response = await fetch(`${API_BASE_URL}/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authentication header when auth is implemented
          // ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(auctionData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create auction')
      }

      const auction = await response.json()
      toast.success('Auction created successfully!')
      onSuccess(auction.id)
    } catch (error: any) {
      console.error('Error creating auction:', error)
      toast.error(error.message || 'Failed to create auction')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Type Selection Step
  if (step === 'type') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Auction Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AUCTION_TYPES.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.value}
                onClick={() => handleTypeSelect(type.value)}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3 group-hover:bg-primary-200">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{type.label}</h3>
                </div>
                <p className="text-sm text-gray-600">{type.description}</p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Details Step
  if (step === 'details') {
    const selectedTypeInfo = AUCTION_TYPES.find(t => t.value === selectedType)
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="mb-6">
          <button
            onClick={() => setStep('type')}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center"
          >
            ← Back to Type Selection
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedTypeInfo?.label} Details
          </h2>
          <p className="text-gray-600 mt-2">{selectedTypeInfo?.description}</p>
        </div>

        <div className="space-y-6">
          {/* Common Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter auction title"
              maxLength={200}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.title.length}/200 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your auction item..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/1000 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <div className="relative">
              <PhotoIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Optional: URL to an image of your auction item
            </p>
          </div>

          {/* Type-Specific Fields */}
          {formData.type === 'DUTCH' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Dutch auctions start at a high price and decrease over time. The first bidder to accept the current price wins.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Price (ETH) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.startPrice}
                    onChange={(e) => handleInputChange('startPrice', e.target.value)}
                    placeholder="10.0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reserve Price (ETH) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.reservePrice}
                    onChange={(e) => handleInputChange('reservePrice', e.target.value)}
                    placeholder="1.0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (hours) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    placeholder="24"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Drop Interval (minutes) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.priceDropInterval}
                    onChange={(e) => handleInputChange('priceDropInterval', e.target.value)}
                    placeholder="60"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {formData.type === 'ENGLISH' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <p className="text-sm text-blue-800">
                  English auctions allow bidders to compete by increasing bids. The highest bidder wins.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bidding Time (hours) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.biddingTime}
                    onChange={(e) => handleInputChange('biddingTime', e.target.value)}
                    placeholder="24"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reserve Price (ETH) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.reservePriceEnglish}
                    onChange={(e) => handleInputChange('reservePriceEnglish', e.target.value)}
                    placeholder="1.0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {formData.type === 'SEALED_BID' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Sealed bid auctions have two phases: bidding (blind) and reveal. Bidders submit encrypted bids first.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bidding Time (hours) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.biddingTimeSealed}
                    onChange={(e) => handleInputChange('biddingTimeSealed', e.target.value)}
                    placeholder="48"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reveal Time (hours) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.revealTime}
                    onChange={(e) => handleInputChange('revealTime', e.target.value)}
                    placeholder="24"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {formData.type === 'HOLD_TO_COMPETE' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Participants must lock ERC20 tokens before bidding. This prevents frivolous bids.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Address (ERC20) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tokenAddress}
                    onChange={(e) => handleInputChange('tokenAddress', e.target.value)}
                    placeholder="0x..."
                    pattern="^0x[a-fA-F0-9]{40}$"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Hold Amount (tokens) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.minHoldAmount}
                      onChange={(e) => handleInputChange('minHoldAmount', e.target.value)}
                      placeholder="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bidding Time (hours) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.biddingTimeHold}
                      onChange={(e) => handleInputChange('biddingTimeHold', e.target.value)}
                      placeholder="24"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {formData.type === 'PLAYABLE' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Playable auctions combine Dutch and English mechanisms with gamification. Non-winners get 80% refund.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Price (ETH) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.startPricePlayable}
                    onChange={(e) => handleInputChange('startPricePlayable', e.target.value)}
                    placeholder="10.0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reserve Price (ETH) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.reservePricePlayable}
                    onChange={(e) => handleInputChange('reservePricePlayable', e.target.value)}
                    placeholder="1.0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (hours) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.durationPlayable}
                    onChange={(e) => handleInputChange('durationPlayable', e.target.value)}
                    placeholder="24"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {formData.type === 'RANDOM_SELECTION' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Random selection auctions use lottery-based winner selection weighted by bid amount for fair distribution.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bidding Time (hours) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.biddingTimeRandom}
                  onChange={(e) => handleInputChange('biddingTimeRandom', e.target.value)}
                  placeholder="48"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          )}

          {formData.type === 'ORDER_BOOK' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Order book auctions match buy and sell orders with a clearing price determined at auction end.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bidding Time (hours) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.biddingTimeOrderBook}
                  onChange={(e) => handleInputChange('biddingTimeOrderBook', e.target.value)}
                  placeholder="24"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={() => setStep('type')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Auction'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

