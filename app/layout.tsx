import type { Metadata } from 'next'
import { Providers } from '@/lib/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'AuctionDApp - Decentralized Auction Platform',
  description: 'A comprehensive auction platform featuring multiple auction types including English, Dutch, Sealed Bid, and more.',
  keywords: 'auction, blockchain, ethereum, smart contracts, decentralized',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
