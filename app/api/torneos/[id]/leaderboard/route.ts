import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { computeLeaderboard } from '@/lib/leaderboard'

// Re-export types for consumers that still import from this route
export type { LeaderboardPlayer, LeaderboardGroup, LeaderboardResponse } from '@/lib/leaderboard'

type RouteContext = { params: Promise<{ id: string }> }

// ── GET /api/torneos/[id]/leaderboard ─────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const data = await computeLeaderboard(Number(id))
  if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(data)
}
