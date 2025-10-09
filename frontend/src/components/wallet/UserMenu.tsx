'use client'

import { useState, useRef, useEffect } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { formatAddress } from '@/utils/formatting'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { account, disconnect, getBalance } = useWeb3()
  const [balance, setBalance] = useState('0')

  useEffect(() => {
    if (account) {
      getBalance().then(setBalance)
    }
  }, [account, getBalance])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleDisconnect = () => {
    disconnect()
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <UserCircleIcon className="h-8 w-8 text-gray-400" />
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">
            {formatAddress(account || '')}
          </div>
          <div className="text-xs text-gray-500">
            {parseFloat(balance).toFixed(4)} ETH
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-900">Account</div>
            <div className="text-xs text-gray-500">{account}</div>
          </div>
          
          <a
            href="/profile"
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <UserCircleIcon className="h-4 w-4 mr-3" />
            Profile
          </a>
          
          <a
            href="/settings"
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Cog6ToothIcon className="h-4 w-4 mr-3" />
            Settings
          </a>
          
          <button
            onClick={handleDisconnect}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
