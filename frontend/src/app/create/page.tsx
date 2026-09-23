'use client'

import { useRouter } from 'next/navigation'
import { AuctionCreationForm } from '@/components/auctions/AuctionCreationForm'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useWeb3 } from '@/contexts/Web3Context'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function CreateAuctionPage() {
  const router = useRouter()
  const { isConnected } = useWeb3()

  if (!isConnected) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3 shrink-0" />
                <div>
                  <h2 className="text-lg font-semibold text-yellow-800 mb-1">
                    Wallet Not Connected
                  </h2>
                  <p className="text-sm text-yellow-700">
                    Please connect your wallet to create an auction.
                  </p>
                </div>
              </div>
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create New Auction</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Set up your auction and choose from 7 different auction mechanisms
          </p>
        </div>

        <ErrorBoundary
          title="Create form failed"
          description="The auction creation form hit an error. Try again."
        >
          <AuctionCreationForm onSuccess={(auctionId) => {
            router.push(`/auctions/${auctionId}`)
          }} />
        </ErrorBoundary>
      </div>
    </div>
  )
}
