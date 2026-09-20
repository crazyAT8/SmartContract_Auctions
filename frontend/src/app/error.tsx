'use client'

import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <ErrorFallback
          error={error}
          resetErrorBoundary={reset}
          title="Something went wrong"
          description="This page hit an unexpected error. Try again, or head back to the home page."
          variant="page"
        />
      </main>
      <Footer />
    </div>
  )
}
