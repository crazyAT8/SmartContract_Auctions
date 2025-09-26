import { formatAuctionType, getAuctionTypeColor } from '@/utils/formatting'
import { 
  ClockIcon, 
  ArrowUpIcon, 
  EyeSlashIcon, 
  LockClosedIcon,
  SparklesIcon,
  GiftIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const auctionTypes = [
  {
    type: 'DUTCH',
    title: 'Dutch Auction',
    description: 'Price starts high and decreases over time. First bidder to accept the current price wins.',
    icon: ClockIcon,
    features: ['Descending price', 'Time-sensitive', 'First-come-first-served'],
    bestFor: 'NFT drops, token sales'
  },
  {
    type: 'ENGLISH',
    title: 'English Auction',
    description: 'Traditional ascending price auction where bidders compete by increasing bids.',
    icon: ArrowUpIcon,
    features: ['Ascending price', 'Competitive bidding', 'Highest bid wins'],
    bestFor: 'Art auctions, collectibles'
  },
  {
    type: 'SEALED_BID',
    title: 'Sealed Bid Auction',
    description: 'Two-phase auction with blind bidding followed by a reveal phase.',
    icon: EyeSlashIcon,
    features: ['Blind bidding', 'Two phases', 'Confidential'],
    bestFor: 'Strategic sales, corporate auctions'
  },
  {
    type: 'HOLD_TO_COMPETE',
    title: 'Hold-to-Compete',
    description: 'Participants must lock ERC20 tokens before bidding. Exclusive to token holders.',
    icon: LockClosedIcon,
    features: ['Token-gated', 'Exclusive access', 'Community-driven'],
    bestFor: 'Governance tokens, exclusive sales'
  },
  {
    type: 'PLAYABLE',
    title: 'Playable Auction',
    description: 'Hybrid Dutch/English with gamification. 80% refund for non-winners.',
    icon: SparklesIcon,
    features: ['Gamified', 'Hybrid mechanism', 'Partial refunds'],
    bestFor: 'Gaming platforms, entertainment'
  },
  {
    type: 'RANDOM_SELECTION',
    title: 'Random Selection',
    description: 'Lottery-based winner selection with weighted probability based on bid amounts.',
    icon: GiftIcon,
    features: ['Fair distribution', 'Weighted selection', 'Equal opportunity'],
    bestFor: 'Fair distribution, raffles'
  },
  {
    type: 'ORDER_BOOK',
    title: 'Order Book',
    description: 'Centralized order matching with buy and sell orders executed at clearing price.',
    icon: ChartBarIcon,
    features: ['Order matching', 'Clearing price', 'Batch execution'],
    bestFor: 'Token exchanges, price discovery'
  }
]

export function AuctionTypes() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Auction Type
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Each auction mechanism offers unique advantages and is designed for different use cases and market conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {auctionTypes.map((auction) => {
            const Icon = auction.icon
            return (
              <div
                key={auction.type}
                className="card hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-primary-100 rounded-lg mr-4">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {auction.title}
                    </h3>
                    <span className={`badge ${getAuctionTypeColor(auction.type)}`}>
                      {formatAuctionType(auction.type)}
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 mb-4">
                  {auction.description}
                </p>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Key Features:</h4>
                  <ul className="space-y-1">
                    {auction.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Best for:</span> {auction.bestFor}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
