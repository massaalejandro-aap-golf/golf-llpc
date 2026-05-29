'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import type { SessionUser } from '@/lib/session'

const staffNavItems = [
  { href: '/',            label: 'Inicio' },
  { href: '/torneos',     label: 'Torneos' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/reservas',    label: 'Reservas' },
  { href: '/jugadores',   label: 'Jugadores' },
  { href: '/cancha',      label: 'Cancha' },
]

const adminItems = [
  { href: '/torneos/nuevo', label: '+ Nuevo torneo' },
  { href: '/ajustes',       label: '⚙ Ajustes' },
]

const socioBottomItems = [
  { href: '/reservas',       label: 'Reservas',   icon: '📅' },
  { href: '/leaderboard',    label: 'Ranking',     icon: '🏆' },
  { href: '/tarjeta-online', label: 'Tarjeta',     icon: '🃏' },
  { href: '/mi-cuenta',      label: 'Mi cuenta',   icon: '👤' },
]

export default function Navbar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const isSocio = user.role === 'SOCIO'

  // ── SOCIO: top bar mínimo + bottom nav ──────────────────────────────────────
  if (isSocio) {
    return (
      <>
        {/* Top bar minimal */}
        <nav className="bg-green-700 text-white shadow-md">
          <div className="px-4 h-12 flex items-center justify-between">
            <Link href="/reservas" className="flex items-center gap-2 font-bold">
              <span>⛳</span>
              <span className="text-sm">La Lucila Polo Club</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs text-green-300 hover:text-white transition-colors px-2 py-1"
            >
              Salir
            </button>
          </div>
        </nav>

        {/* Bottom nav fija — solo en mobile */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg sm:hidden">
          <div className="grid grid-cols-4 h-16">
            {socioBottomItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                    active ? 'text-green-700' : 'text-gray-400'
                  }`}
                >
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span className={`text-[10px] ${active ? 'font-bold' : ''}`}>{item.label}</span>
                  {active && <span className="w-1 h-1 rounded-full bg-green-600 mt-0.5" />}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Nav horizontal solo en desktop para SOCIO */}
        <nav className="hidden sm:block bg-green-700 border-t border-green-600">
          <div className="container mx-auto px-4 max-w-7xl flex gap-1 h-10 items-center">
            {socioBottomItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-green-900 text-white'
                    : 'text-green-100 hover:bg-green-600'
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </>
    )
  }

  // ── STAFF: hamburger en mobile, nav horizontal en desktop ──────────────────
  return (
    <nav className="bg-green-700 text-white shadow-md relative z-40">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span>⛳</span>
            <span className="hidden sm:inline">La Lucila Polo Club</span>
            <span className="sm:hidden text-sm">LLPC Golf</span>
          </Link>

          {/* Nav links — solo desktop */}
          <div className="hidden md:flex items-center gap-1">
            {staffNavItems.map((item) => (
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

          {/* Derecha: usuario + hamburger */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-green-200 hidden sm:inline truncate max-w-[120px]">{user.nombre}</span>
            <button
              onClick={handleLogout}
              className="hidden md:inline text-xs text-green-300 hover:text-white transition-colors"
            >
              Salir
            </button>
            {/* Hamburger — solo mobile */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden flex flex-col gap-1 p-2 rounded-md hover:bg-green-600 transition-colors"
              aria-label="Menú"
            >
              <span className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Menú mobile desplegable */}
      {menuOpen && (
        <div className="md:hidden bg-green-800 border-t border-green-600">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {staffNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-green-900 text-white'
                    : 'text-green-100 hover:bg-green-700'
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
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            <div className="border-t border-green-600 pt-2 mt-2 flex items-center justify-between px-4 py-2">
              <span className="text-sm text-green-300">{user.nombre}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-green-300 hover:text-white bg-green-700 px-3 py-1.5 rounded-md"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
