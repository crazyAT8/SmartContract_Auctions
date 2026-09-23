import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-secondary-950 dark:text-gray-100">
      <Header />
      <main className="flex-1 w-full">{children}</main>
      <Footer />
    </div>
  )
}
