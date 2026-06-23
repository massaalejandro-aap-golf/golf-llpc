'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Props {
  href: string
  className?: string
  children: React.ReactNode
  loadingText?: string
}

export default function NavLink({ href, className, children, loadingText = 'Cargando...' }: Props) {
  const [loading, setLoading] = useState(false)

  return (
    <Link
      href={href}
      className={`${className ?? ''} ${loading ? 'opacity-70 pointer-events-none' : ''}`}
      onClick={() => setLoading(true)}
    >
      {loading ? loadingText : children}
    </Link>
  )
}
