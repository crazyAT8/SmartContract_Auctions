export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatEther(wei: string | bigint): string {
  const value = typeof wei === 'string' ? wei : wei.toString()
  const num = parseFloat(value) / 1e18
  return num.toFixed(4)
}

export function formatNumber(num: number | string, decimals: number = 2): string {
  const value = typeof num === 'string' ? parseFloat(num) : num
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ended'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export function formatAuctionType(type: string): string {
  const types: Record<string, string> = {
    DUTCH: 'Dutch Auction',
    ENGLISH: 'English Auction',
    SEALED_BID: 'Sealed Bid Auction',
    HOLD_TO_COMPETE: 'Hold-to-Compete Auction',
    PLAYABLE: 'Playable Auction',
    RANDOM_SELECTION: 'Random Selection Auction',
    ORDER_BOOK: 'Order Book Auction',
  }
  
  return types[type] || type
}

export function getAuctionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    DUTCH: 'bg-orange-100 text-orange-800',
    ENGLISH: 'bg-blue-100 text-blue-800',
    SEALED_BID: 'bg-purple-100 text-purple-800',
    HOLD_TO_COMPETE: 'bg-green-100 text-green-800',
    PLAYABLE: 'bg-pink-100 text-pink-800',
    RANDOM_SELECTION: 'bg-yellow-100 text-yellow-800',
    ORDER_BOOK: 'bg-indigo-100 text-indigo-800',
  }
  
  return colors[type] || 'bg-gray-100 text-gray-800'
}

export function getAuctionStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    ENDED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  }
  
  return colors[status] || 'bg-gray-100 text-gray-800'
}
