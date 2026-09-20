import { getUserFriendlyError } from '@/utils/errors'

describe('getUserFriendlyError', () => {
  it('returns fallback for empty errors', () => {
    expect(getUserFriendlyError(null, 'fallback')).toBe('fallback')
    expect(getUserFriendlyError(undefined, 'fallback')).toBe('fallback')
  })

  it('maps wallet rejection codes', () => {
    expect(getUserFriendlyError({ code: 4001, message: 'whatever' })).toBe(
      'Transaction rejected in wallet'
    )
    expect(getUserFriendlyError(new Error('user rejected the request'))).toBe(
      'Transaction rejected in wallet'
    )
  })

  it('maps network and funds errors', () => {
    expect(getUserFriendlyError(new Error('Failed to fetch'))).toMatch(/Network error/)
    expect(getUserFriendlyError(new Error('insufficient funds for gas'))).toMatch(
      /Insufficient funds/
    )
  })

  it('prefers revert reason when present', () => {
    expect(
      getUserFriendlyError({
        message: `execution reverted: "Bid too low"`,
        reason: 'Bid too low',
      })
    ).toBe('Bid too low')
  })

  it('shortens very long messages', () => {
    const long = 'x'.repeat(200)
    const result = getUserFriendlyError(new Error(long))
    expect(result.length).toBeLessThanOrEqual(160)
    expect(result.endsWith('...')).toBe(true)
  })
})
