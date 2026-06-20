import { requireSession } from '@/lib/session'
import { computeLeaderboard } from '@/lib/leaderboard'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LeaderboardClient from './LeaderboardClient'

export const dynamic = 'force-dynamic'

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default async function MobileTorneoLeaderboardPage({
  params,
}: {
  params: Promise<{ torneoId: string }>
}) {
  await requireSession()
  const { torneoId } = await params
  const id = parseInt(torneoId)
  if (isNaN(id)) notFound()

  const lb = await computeLeaderboard(id)
  if (!lb) notFound()

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-green-700 text-white px-6 pt-10 pb-6">
        <p className="text-green-200 text-sm font-medium tracking-wide uppercase">Leaderboard</p>
        <h1 className="text-lg font-bold mt-1 leading-snug">{lb.torneo.nombre}</h1>
        <p className="text-green-200 text-xs mt-1">{fmtFecha(lb.torneo.fecha)} · {lb.torneo.tipo}</p>
      </div>

      <div className="flex-1">
        <LeaderboardClient lb={lb} />
      </div>

      <div className="p-4">
        <Link
          href="/mobile/leaderboard"
          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-5 py-4 font-semibold active:scale-95 transition-transform"
        >
          ← Volver a torneos
        </Link>
      </div>
    </div>
  )
}
