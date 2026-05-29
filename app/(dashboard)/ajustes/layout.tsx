import Link from 'next/link'
import { requireRole } from '@/lib/session'

export default async function AjustesLayout({ children }: { children: React.ReactNode }) {
  await requireRole('COMISION')

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <nav className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <NavTab href="/ajustes/canchas"    label="⛳ Canchas" />
        <NavTab href="/ajustes/categorias" label="🏷️ Categorías" />
        <NavTab href="/ajustes/aag"        label="🔄 AAG Sync" />
      </nav>
      {children}
    </div>
  )
}

function NavTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-1.5 text-sm font-medium rounded-md text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all"
    >
      {label}
    </Link>
  )
}
