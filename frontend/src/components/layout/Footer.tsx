import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Auction dApp</span>
            </div>
            <p className="text-gray-600 max-w-md">
              A decentralized auction platform supporting multiple auction types including Dutch, English, Sealed Bid, and more.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/auctions" className="text-gray-600 hover:text-primary-600">
                  Browse Auctions
                </Link>
              </li>
              <li>
                <Link href="/create" className="text-gray-600 hover:text-primary-600">
                  Create Auction
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Auction dApp. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
