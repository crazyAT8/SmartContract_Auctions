'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export interface ErrorFallbackProps {
  error?: Error | null
  resetErrorBoundary?: () => void
  title?: string
  description?: string
  /** Full-page vs compact in-section recovery UI */
  variant?: 'page' | 'section'
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. You can try again or continue browsing.',
  variant = 'page',
}: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development'
  const isSection = variant === 'section'

  return (
    <div
      role="alert"
      className={
        isSection
          ? 'rounded-lg border border-red-200 bg-red-50 p-6'
          : 'flex min-h-[50vh] items-center justify-center px-4 py-12'
      }
    >
      <div className={isSection ? '' : 'mx-auto max-w-md text-center'}>
        <div className={isSection ? 'flex items-start gap-3' : ''}>
          <ExclamationTriangleIcon
            className={
              isSection
                ? 'h-6 w-6 flex-shrink-0 text-red-500'
                : 'mx-auto mb-4 h-12 w-12 text-red-500'
            }
            aria-hidden="true"
          />
          <div className={isSection ? 'flex-1' : ''}>
            <h2
              className={
                isSection
                  ? 'text-lg font-semibold text-red-800'
                  : 'mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100'
              }
            >
              {title}
            </h2>
            <p
              className={
                isSection
                  ? 'mt-1 text-sm text-red-700'
                  : 'mb-6 text-gray-600 dark:text-gray-400'
              }
            >
              {description}
            </p>

            {isDev && error?.message && (
              <pre
                className={
                  isSection
                    ? 'mt-3 overflow-auto rounded bg-red-100 p-2 text-left text-xs text-red-900'
                    : 'mb-6 overflow-auto rounded-lg bg-gray-100 dark:bg-secondary-800 p-3 text-left text-xs text-gray-700 dark:text-gray-300'
                }
              >
                {error.message}
              </pre>
            )}

            {resetErrorBoundary && (
              <div className={isSection ? 'mt-4 flex flex-wrap gap-2' : 'flex flex-wrap justify-center gap-3'}>
                <button
                  type="button"
                  onClick={resetErrorBoundary}
                  className="btn-primary"
                >
                  Try again
                </button>
                {!isSection && (
                  <a href="/" className="btn-outline">
                    Go home
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
