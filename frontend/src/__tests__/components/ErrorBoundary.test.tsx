import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ErrorFallback } from '@/components/ui/ErrorFallback'

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Boom')
  }
  return <div>All good</div>
}

// Suppress expected React error boundary console noise in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = String(args[0] ?? '')
    if (
      message.includes('ErrorBoundary') ||
      message.includes('The above error occurred') ||
      message.includes('Boom')
    ) {
      return
    }
    originalError(...args)
  }
})
afterAll(() => {
  console.error = originalError
})

describe('ErrorFallback', () => {
  it('renders title and description', () => {
    render(
      <ErrorFallback
        title="Test failure"
        description="Something broke"
        resetErrorBoundary={() => undefined}
      />
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Test failure')).toBeInTheDocument()
    expect(screen.getByText('Something broke')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls reset when Try again is clicked', () => {
    const reset = jest.fn()
    render(<ErrorFallback resetErrorBoundary={reset} />)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('shows fallback when a child throws', () => {
    render(
      <ErrorBoundary title="Section crashed">
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('Section crashed')).toBeInTheDocument()
    expect(screen.queryByText('All good')).not.toBeInTheDocument()
  })

  it('recovers after Try again when the child stops throwing', () => {
    function Harness({ shouldThrow }: { shouldThrow: boolean }) {
      return (
        <ErrorBoundary>
          <ThrowingChild shouldThrow={shouldThrow} />
        </ErrorBoundary>
      )
    }

    const { rerender } = render(<Harness shouldThrow />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

    // Child is safe again, but boundary still holds error state until reset
    rerender(<Harness shouldThrow={false} />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('resets when resetKeys change', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['a']} title="Failed">
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('Failed')).toBeInTheDocument()

    rerender(
      <ErrorBoundary resetKeys={['b']} title="Failed">
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })
})
