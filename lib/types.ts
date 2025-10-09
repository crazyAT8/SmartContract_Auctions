import { Contract } from 'ethers'

export interface AuctionContract {
  address: string
  contract: Contract
  type: AuctionType
  name: string
  description: string
  icon: string
}

export type AuctionType = 
  | 'english'
  | 'dutch' 
  | 'sealed-bid'
  | 'hold-to-compete'
  | 'order-book'
  | 'playable'
  | 'random-selection'

export const AUCTION_TYPES: Record<AuctionType, {
  name: string
  description: string
  icon: string
  features: string[]
}> = {
  'english': {
    name: 'English Auction',
    description: 'Traditional ascending bid auction where participants bid against each other',
    icon: '📈',
    features: ['Open bidding', 'Price discovery', 'Reserve price protection']
  },
  'dutch': {
    name: 'Dutch Auction',
    description: 'Descending price auction where the price drops until someone buys',
    icon: '📉',
    features: ['Fast execution', 'Price drops over time', 'First-come-first-served']
  },
  'sealed-bid': {
    name: 'Sealed Bid Auction',
    description: 'Private bidding with two phases: blind bidding and reveal',
    icon: '🔒',
    features: ['Confidential bidding', 'Two-phase process', 'Fair competition']
  },
  'hold-to-compete': {
    name: 'Hold to Compete',
    description: 'Requires token locking before bidding to prevent frivolous bids',
    icon: '🔐',
    features: ['Token commitment', 'Anti-gaming', 'Serious bidders only']
  },
  'order-book': {
    name: 'Order Book Auction',
    description: 'Matching engine for buy and sell orders with clearing price',
    icon: '📊',
    features: ['Order matching', 'Market efficiency', 'Batch execution']
  },
  'playable': {
    name: 'Playable Auction',
    description: 'Gamified auction with price drops and partial refunds',
    icon: '🎮',
    features: ['Interactive experience', 'Partial refunds', 'Engaging gameplay']
  },
  'random-selection': {
    name: 'Random Selection',
    description: 'Lottery-based winner selection weighted by bid amount',
    icon: '🎲',
    features: ['Fair distribution', 'Weighted probability', 'Equal opportunity']
  }
}
