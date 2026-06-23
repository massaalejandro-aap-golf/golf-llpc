'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Props {
  href: string
  icon: string
  label: string
  color: string
}

export default function MenuButton({ href, icon, label, color }: Props) {
  const [loading, setLoading] = useState(false)

  return (
    <Link
      href={href}
      onClick={() => setLoading(true)}
      className={`flex items-center gap-4 w-full ${color} rounded-2xl px-5 py-4 shadow-sm active:scale-95 transition-transform ${loading ? 'opacity-70 pointer-events-none' : ''}`}
    >
      <span className="text-2xl">{loading ? '⏳' : icon}</span>
      <span className="text-base font-semibold">{loading ? 'Cargando...' : label}</span>
      {!loading && <span className="ml-auto opacity-50 text-lg">›</span>}
    </Link>
  )
}
