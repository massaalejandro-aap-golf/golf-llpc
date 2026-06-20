import { requireSession } from '@/lib/session'
import type { ReactNode } from 'react'

export default async function TarjetaLayout({ children }: { children: ReactNode }) {
  await requireSession()
  return <>{children}</>
}
