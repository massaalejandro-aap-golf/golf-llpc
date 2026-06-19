import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

export const dynamic = 'force-dynamic'

const MENU_ITEMS = [
  { href: '/mobile/tarjeta',     icon: '🃏', label: 'Carga online de tarjeta', color: 'bg-green-600 hover:bg-green-700 text-white' },
  { href: '/mobile/handicap',    icon: '⛳', label: 'Handicap de juego',        color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  { href: '/mobile/leaderboard', icon: '🏆', label: 'Leaderboard',              color: 'bg-amber-400 hover:bg-amber-500 text-amber-900' },
  { href: '/mobile/reservas',    icon: '📅', label: 'Reservas',                 color: 'bg-sky-400 hover:bg-sky-500 text-sky-900' },
  { href: '/mobile/reglas',      icon: '📋', label: 'Reglas locales',           color: 'bg-violet-300 hover:bg-violet-400 text-violet-900' },
  { href: '/mobile/mis-datos',   icon: '👤', label: 'Mis datos',                color: 'bg-slate-300 hover:bg-slate-400 text-slate-800' },
]

export default async function MobilePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-green-700 text-white px-6 pt-10 pb-8 flex items-center gap-4">
        <Image src="/logo.png" alt="Logo" width={64} height={64} className="rounded-xl bg-white/10 p-1 shrink-0 object-contain" />
        <div>
          <p className="text-green-100 text-base font-bold tracking-wide uppercase">La Lucila Polo Club</p>
          <h1 className="text-xl font-bold mt-0.5">Bienvenido, {session.nombre}</h1>
        </div>
      </div>

      {/* Menú */}
      <div className="flex-1 px-4 py-6 space-y-3">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-4 w-full ${item.color} rounded-2xl px-5 py-4 shadow-sm active:scale-95 transition-transform`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-base font-semibold">{item.label}</span>
            <span className="ml-auto opacity-50 text-lg">›</span>
          </Link>
        ))}

        <LogoutButton />
      </div>
    </div>
  )
}
