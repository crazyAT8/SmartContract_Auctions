import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  UsersIcon, 
  ClockIcon 
} from '@heroicons/react/24/outline'

const stats = [
  {
    name: 'Total Auctions',
    value: '1,247',
    change: '+12%',
    changeType: 'positive',
    icon: ChartBarIcon,
    description: 'Auctions created this month'
  },
  {
    name: 'Total Volume',
    value: '2,847 ETH',
    change: '+8.2%',
    changeType: 'positive',
    icon: CurrencyDollarIcon,
    description: 'Total value traded'
  },
  {
    name: 'Active Users',
    value: '3,429',
    change: '+15.3%',
    changeType: 'positive',
    icon: UsersIcon,
    description: 'Unique participants'
  },
  {
    name: 'Avg. Duration',
    value: '2.4h',
    change: '-5.1%',
    changeType: 'negative',
    icon: ClockIcon,
    description: 'Average auction time'
  }
]

export function Stats() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Platform Statistics
          </h2>
          <p className="text-xl text-gray-600">
            Real-time data showing the growth and activity of our auction platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.name} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary-100 rounded-full">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                </div>
                
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                
                <div className="text-lg font-medium text-gray-900 mb-1">
                  {stat.name}
                </div>
                
                <div className="flex items-center justify-center mb-2">
                  <span
                    className={`text-sm font-medium ${
                      stat.changeType === 'positive'
                        ? 'text-success-600'
                        : 'text-error-600'
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
                
                <div className="text-sm text-gray-500">
                  {stat.description}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-primary-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-900">
                Platform is live and operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
