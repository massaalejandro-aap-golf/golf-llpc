import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { computeLeaderboard } from '@/lib/leaderboard'
import type { LeaderboardResponse } from '@/lib/leaderboard'
import LeaderboardIndex from './LeaderboardIndex'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  await requireSession()

  const torneos = await prisma.tournament.findMany({
    orderBy: { fecha: 'desc' },
    select: {
      id:     true,
      nombre: true,
      fecha:  true,
      tipo:   true,
      hoyos:  true,
      _count: { select: { scorecards: true } },
    },
  })

  // Pre-computar todos los leaderboards en paralelo (server-side)
  const leaderboardResults = await Promise.all(
    torneos.map((t) => computeLeaderboard(t.id))
  )

  const initialData: Record<number, LeaderboardResponse> = {}
  leaderboardResults.forEach((lb, i) => {
    if (lb) initialData[torneos[i].id] = lb
  })

  // Serializar fechas (Date → string para el Client Component)
  const serialized = torneos.map((t) => ({
    ...t,
    fecha: t.fecha.toISOString(),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Resultados de todos los torneos — hacé clic para desplegar
        </p>
      </div>

      <LeaderboardIndex torneos={serialized} initialData={initialData} />
    </div>
  )
}
