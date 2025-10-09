'use client'

import { useWeb3 } from '@/contexts/Web3Context'
import { WalletIcon } from '@heroicons/react/24/outline'

export function WalletConnectButton() {
  const { connect, isConnecting } = useWeb3()

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="btn-primary flex items-center space-x-2"
    >
      <WalletIcon className="h-5 w-5" />
      <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
    </button>
  )
}
