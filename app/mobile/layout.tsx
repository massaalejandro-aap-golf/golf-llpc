import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'La Lucila Golf Club',
  description: 'App móvil del club',
}

export default async function MobileLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login?from=/mobile')
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {children}
    </div>
  )
}
