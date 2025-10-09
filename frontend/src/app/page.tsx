import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { Hero } from '@/components/sections/Hero'
import { AuctionTypes } from '@/components/sections/AuctionTypes'
import { FeaturedAuctions } from '@/components/sections/FeaturedAuctions'
import { Stats } from '@/components/sections/Stats'
import { Footer } from '@/components/layout/Footer'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main>
        <Suspense fallback={<LoadingSpinner />}>
          <Hero />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <AuctionTypes />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <FeaturedAuctions />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <Stats />
        </Suspense>
      </main>
      
      <Footer />
    </div>
  )
}
