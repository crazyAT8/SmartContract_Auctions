'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorFallback } from './ErrorFallback'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional custom fallback; receives error + reset */
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode)
  title?: string
  description?: string
  variant?: 'page' | 'section'
  onError?: (error: Error, info: ErrorInfo) => void
  /** When this value changes, the boundary resets (e.g. route id) */
  resetKeys?: unknown[]
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    this.props.onError?.(error, info)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (!this.state.error || !this.props.resetKeys || !prevProps.resetKeys) {
      return
    }

    const changed = this.props.resetKeys.some(
      (key, index) => !Object.is(key, prevProps.resetKeys?.[index])
    )

    if (changed) {
      this.reset()
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const {
      children,
      fallback,
      title,
      description,
      variant = 'section',
    } = this.props

    if (!error) {
      return children
    }

    if (typeof fallback === 'function') {
      return fallback({ error, reset: this.reset })
    }

    if (fallback) {
      return fallback
    }

    return (
      <ErrorFallback
        error={error}
        resetErrorBoundary={this.reset}
        title={title}
        description={description}
        variant={variant}
      />
    )
  }
}
