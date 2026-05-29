'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { SessionUser } from '@/lib/session'

const staffNavItems = [
  { href: '/',            label: 'Inicio' },
  { href: '/torneos',     label: 'Torneos' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/reservas',    label: 'Reservas' },
  { href: '/jugadores',   label: 'Jugadores' },
  { href: '/cancha',      label: 'Cancha' },
]

const socioNavItems = [
  { href: '/reservas',    label: 'Reservas' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

const adminItems = [
  { href: '/torneos/nuevo', label: '+ Nuevo torneo' },
  { href: '/ajustes',       label: '⚙ Ajustes' },
]

export default function Navbar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const isSocio = user.role === 'SOCIO'
  const navItems = isSocio ? socioNavItems : staffNavItems

  return (
    <nav className="bg-green-700 text-white shadow-md">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href={isSocio ? '/reservas' : '/'} className="flex items-center gap-2 font-bold text-lg">
            <span>⛳</span>
            <span className="hidden sm:inline">La Lucila Polo Club</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-green-900 text-white'
                    : 'text-green-100 hover:bg-green-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {(user.role === 'ADMIN' || user.role === 'COMISION') &&
              adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-green-500 hover:bg-green-400 transition-colors ml-2"
                >
                  {item.label}
                </Link>
              ))}
          </div>

          {/* Usuario */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-green-200 hidden sm:inline">{user.nombre}</span>
            {isSocio && (
              <Link href="/mi-cuenta" className="text-xs text-green-300 hover:text-white transition-colors">
                Mi cuenta
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-green-300 hover:text-white transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
