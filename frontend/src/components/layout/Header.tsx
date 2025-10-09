'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWeb3 } from '@/contexts/Web3Context'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { UserMenu } from '@/components/wallet/UserMenu'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isConnected } = useWeb3()

  const navigation = [
    { name: 'Auctions', href: '/auctions' },
    { name: 'Create', href: '/create' },
    { name: 'My Auctions', href: '/my-auctions' },
    { name: 'My Bids', href: '/my-bids' },
  ]

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Auction dApp</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop Wallet */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {isConnected ? <UserMenu /> : <WalletConnectButton />}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <MobileMenu
        open={mobileMenuOpen}
        setOpen={setMobileMenuOpen}
        navigation={navigation}
      />
    </header>
  )
}
