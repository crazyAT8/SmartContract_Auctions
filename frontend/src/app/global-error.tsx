'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/ui/ErrorFallback'

/**
 * Catches errors in the root layout. Must define its own <html>/<body>
 * because it replaces the root layout when active.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Global Error]', error)
  }, [error])

  return (
    <html lang="en">
      <body className="bg-gray-50 dark:bg-secondary-950 text-gray-900 dark:text-gray-100 antialiased">
        <ErrorFallback
          error={error}
          resetErrorBoundary={reset}
          title="Application error"
          description="The app failed to load. Please try again."
          variant="page"
        />
      </body>
    </html>
  )
}
