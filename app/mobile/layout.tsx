import { requireSession } from '@/lib/session'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'La Lucila Golf Club',
  description: 'App móvil del club',
}

export default async function MobileLayout({ children }: { children: ReactNode }) {
  await requireSession()
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {children}
    </div>
  )
}
