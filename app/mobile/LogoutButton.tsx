'use client'

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-4 w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-2xl px-5 py-4 active:scale-95 transition-transform"
    >
      <span className="text-2xl">🚪</span>
      <span className="text-base font-semibold">Cerrar sesión</span>
    </button>
  )
}
