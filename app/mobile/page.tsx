import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

export const dynamic = 'force-dynamic'

const MENU_ITEMS = [
  { href: '/mobile/tarjeta',     icon: '🃏', label: 'Carga online de tarjeta', color: 'bg-green-600 hover:bg-green-700' },
  { href: '/mobile/handicap',    icon: '⛳', label: 'Handicap de juego',        color: 'bg-emerald-600 hover:bg-emerald-700' },
  { href: '/mobile/leaderboard', icon: '🏆', label: 'Leaderboard',              color: 'bg-yellow-600 hover:bg-yellow-700' },
  { href: '/mobile/reservas',    icon: '📅', label: 'Reservas',                 color: 'bg-blue-600 hover:bg-blue-700' },
  { href: '/mobile/reglas',      icon: '📋', label: 'Reglas locales',           color: 'bg-purple-600 hover:bg-purple-700' },
  { href: '/mobile/mis-datos',   icon: '👤', label: 'Mis datos',                color: 'bg-gray-600 hover:bg-gray-700' },
]

export default async function MobilePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-green-700 text-white px-6 pt-10 pb-8">
        <p className="text-green-200 text-sm font-medium tracking-wide uppercase">La Lucila Golf Club</p>
        <h1 className="text-2xl font-bold mt-1">Bienvenido, {session.nombre}</h1>
      </div>

      {/* Menú */}
      <div className="flex-1 px-4 py-6 space-y-3">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-4 w-full ${item.color} text-white rounded-2xl px-5 py-4 shadow-sm active:scale-95 transition-transform`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-base font-semibold">{item.label}</span>
            <span className="ml-auto text-white/60 text-lg">›</span>
          </Link>
        ))}

        <LogoutButton />
      </div>
    </div>
  )
}
