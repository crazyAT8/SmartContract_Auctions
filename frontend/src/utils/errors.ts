/**
 * Extract a short, user-facing message from API / ethers / wallet errors.
 */
export function getUserFriendlyError(
  error: unknown,
  fallback = 'Something went wrong'
): string {
  if (error == null) return fallback

  if (typeof error === 'string' && error.trim()) {
    return shortenErrorMessage(error.trim())
  }

  const code = getNumericCode(error)
  const raw = collectRawMessage(error)

  if (code === 4001 || /user rejected|user denied|action_rejected/i.test(raw)) {
    return 'Transaction rejected in wallet'
  }

  if (code === 4902) {
    return 'Network not found in wallet. Add it and try again.'
  }

  if (/insufficient funds|exceeds balance/i.test(raw)) {
    return 'Insufficient funds for this transaction'
  }

  if (/network|failed to fetch|fetch failed|timeout|ECONNREFUSED/i.test(raw)) {
    return 'Network error. Check your connection and try again.'
  }

  if (/nonce too low|replacement transaction underpriced/i.test(raw)) {
    return 'Transaction conflict. Wait a moment and retry.'
  }

  const revert = extractRevertReason(error)
  if (revert) return shortenErrorMessage(revert)

  if (raw) return shortenErrorMessage(raw)
  return fallback
}

function getNumericCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  const code = (error as { code: unknown }).code
  if (typeof code === 'number') return code
  if (typeof code === 'string' && /^-?\d+$/.test(code)) return Number(code)
  return undefined
}

function collectRawMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (typeof obj.shortMessage === 'string' && obj.shortMessage) return obj.shortMessage
    if (typeof obj.message === 'string' && obj.message) return obj.message
    if (typeof obj.reason === 'string' && obj.reason) return obj.reason
  }
  return ''
}

function extractRevertReason(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null
  const obj = error as Record<string, unknown>

  if (typeof obj.reason === 'string' && obj.reason && !/^0x/.test(obj.reason)) {
    return obj.reason
  }

  const data = obj.data
  if (typeof data === 'object' && data !== null) {
    const nested = data as Record<string, unknown>
    if (typeof nested.message === 'string' && nested.message) {
      const match = nested.message.match(/reverted with reason string ['"](.+?)['"]/i)
      if (match?.[1]) return match[1]
      return nested.message
    }
  }

  const msg = typeof obj.message === 'string' ? obj.message : ''
  const match = msg.match(/reverted with reason string ['"](.+?)['"]/i)
  if (match?.[1]) return match[1]

  return null
}

function shortenErrorMessage(message: string): string {
  const cleaned = message
    .replace(/^execution reverted:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim()

  if (cleaned.length <= 160) return cleaned
  return `${cleaned.slice(0, 157)}...`
}
