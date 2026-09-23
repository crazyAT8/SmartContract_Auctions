'use client'

import toast from 'react-hot-toast'
import { getUserFriendlyError } from '@/utils/errors'

export type ToastId = string

/**
 * Show a dismissible error toast. When `onRetry` is provided, include a Retry action.
 */
export function toastErrorWithRetry(
  error: unknown,
  options?: {
    fallback?: string
    id?: string
    onRetry?: () => void
    duration?: number
  }
): ToastId {
  const message = getUserFriendlyError(error, options?.fallback ?? 'Something went wrong')
  const id = options?.id
  const onRetry = options?.onRetry

  if (!onRetry) {
    return toast.error(message, {
      id,
      duration: options?.duration ?? 5000,
    })
  }

  return toast.error(
    (t) => (
      <div className="flex items-start gap-3 min-w-[200px]">
        <span className="flex-1 text-sm leading-snug">{message}</span>
        <button
          type="button"
          className="shrink-0 rounded px-2 py-1 text-xs font-semibold bg-white dark:bg-secondary-900/20 hover:bg-white dark:bg-secondary-900/30 transition-colors"
          onClick={() => {
            toast.dismiss(t.id)
            onRetry()
          }}
        >
          Retry
        </button>
      </div>
    ),
    {
      id,
      duration: options?.duration ?? 10000,
    }
  )
}

export function toastSuccess(message: string, id?: string): ToastId {
  return toast.success(message, { id, duration: 4000 })
}

export function toastLoading(message: string, id?: string): ToastId {
  return toast.loading(message, { id })
}

export function toastDismiss(id?: string): void {
  if (id) toast.dismiss(id)
  else toast.dismiss()
}

/** Shared toast ids for in-flight transactions */
export const TX_TOAST_ID = 'tx-pending'
export const REVEAL_TOAST_ID = 'reveal-pending'
export const CREATE_TOAST_ID = 'create-auction'
export const CONNECT_TOAST_ID = 'wallet-connect'
