'use client'

import { useEffect } from 'react'
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
    <ErrorFallback
      error={error}
      resetErrorBoundary={reset}
      title="Something went wrong"
      description="This page hit an unexpected error. Try again, or head back to the home page."
      variant="page"
    />
  )
}
