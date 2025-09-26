'use client'

import Link from 'next/link'
import { useWeb3 } from '@/contexts/Web3Context'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { UserMenu } from '@/components/wallet/UserMenu'

interface MobileMenuProps {
  open: boolean
  setOpen: (open: boolean) => void
  navigation: Array<{ name: string; href: string }>
}

export function MobileMenu({ open, setOpen, navigation }: MobileMenuProps) {
  const { isConnected } = useWeb3()

  if (!open) return null

  return (
    <div className="md:hidden">
      <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="text-gray-700 hover:text-primary-600 block px-3 py-2 text-base font-medium"
            onClick={() => setOpen(false)}
          >
            {item.name}
          </Link>
        ))}
        
        <div className="pt-4 border-t border-gray-200">
          {isConnected ? <UserMenu /> : <WalletConnectButton />}
        </div>
      </div>
    </div>
  )
}
