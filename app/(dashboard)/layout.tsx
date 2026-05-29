import { requireSession } from '@/lib/session'
import Navbar from '@/components/layout/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()
  const isSocio = session.role === 'SOCIO'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session} />
      {/* pb-20 en mobile para SOCIO (espacio para bottom nav fija de 64px) */}
      <main className={`flex-1 container mx-auto px-4 py-6 max-w-7xl ${isSocio ? 'pb-24 sm:pb-6' : ''}`}>
        {children}
      </main>
    </div>
  )
}
