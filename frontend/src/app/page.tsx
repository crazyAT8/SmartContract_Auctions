import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { Hero } from '@/components/sections/Hero'
import { AuctionTypes } from '@/components/sections/AuctionTypes'
import { FeaturedAuctions } from '@/components/sections/FeaturedAuctions'
import { Stats } from '@/components/sections/Stats'
import { Footer } from '@/components/layout/Footer'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main>
        <ErrorBoundary title="Hero failed to load" description="The hero section hit an error. Other parts of the page should still work.">
          <Suspense fallback={<LoadingSpinner />}>
            <Hero />
          </Suspense>
        </ErrorBoundary>
        
        <ErrorBoundary title="Auction types failed to load" description="Could not render auction types. Try again or browse auctions directly.">
          <Suspense fallback={<LoadingSpinner />}>
            <AuctionTypes />
          </Suspense>
        </ErrorBoundary>
        
        <ErrorBoundary title="Featured auctions failed to load" description="Could not load featured auctions. Try again or visit All Auctions.">
          <Suspense fallback={<LoadingSpinner />}>
            <FeaturedAuctions />
          </Suspense>
        </ErrorBoundary>
        
        <ErrorBoundary title="Stats failed to load" description="Could not load platform stats.">
          <Suspense fallback={<LoadingSpinner />}>
            <Stats />
          </Suspense>
        </ErrorBoundary>
      </main>
      
      <Footer />
    </div>
  )
}
