import { requireSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()

  // SOCIOs usan la versión mobile
  if (session.role === 'SOCIO') redirect('/mobile')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session} />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  )
}
