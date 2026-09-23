'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AsyncStateProps {
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  loadingLabel?: string
  children: React.ReactNode
  /** Compact empty/error wrapper for cards vs full section */
  className?: string
}

/**
 * Renders loading / error-with-retry / children for async data views.
 */
export function AsyncState({
  loading = false,
  error = null,
  onRetry,
  loadingLabel,
  children,
  className = '',
}: AsyncStateProps) {
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 gap-3 ${className}`}>
        <LoadingSpinner />
        {loadingLabel && <p className="text-sm text-gray-500 dark:text-gray-400">{loadingLabel}</p>}
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className={`rounded-lg border border-red-200 bg-red-50 p-6 text-center ${className}`}
      >
        <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-500 mb-3" aria-hidden />
        <p className="text-sm text-red-800 mb-4">{error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-primary">
            Retry
          </button>
        )}
      </div>
    )
  }

  return <>{children}</>
}
