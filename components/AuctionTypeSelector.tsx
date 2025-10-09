import React from 'react'
import { motion } from 'framer-motion'
import { AUCTION_TYPES, AuctionType } from '@/lib/types'

interface AuctionTypeCardProps {
  type: AuctionType
  onClick: () => void
}

export function AuctionTypeCard({ type, onClick }: AuctionTypeCardProps) {
  const auctionInfo = AUCTION_TYPES[type]
  
  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 hover:border-primary-300"
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="text-4xl">{auctionInfo.icon}</div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{auctionInfo.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{auctionInfo.description}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          {auctionInfo.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-600">Create Auction</span>
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface AuctionTypeSelectorProps {
  onSelectType: (type: AuctionType) => void
}

export default function AuctionTypeSelector({ onSelectType }: AuctionTypeSelectorProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Auction Type
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Select from our comprehensive collection of auction mechanisms, each designed for different use cases and market dynamics.
        </p>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(Object.keys(AUCTION_TYPES) as AuctionType[]).map((type, index) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <AuctionTypeCard type={type} onClick={() => onSelectType(type)} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
