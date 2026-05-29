import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Ctx = { params: Promise<{ scorecardId: string }> }

// GET /api/tarjeta-online/[scorecardId]/cross-check
// Para la tarjeta oficial de JUG (ronda=1), busca la tarjeta de control (ronda=2)
// del mismo jugador para detectar inconsistencias.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ scores: {} })

  const { scorecardId } = await params
  const sc = await prisma.scorecard.findUnique({
    where: { id: Number(scorecardId) },
    select: { tournamentId: true, playerId: true, ronda: true },
  })
  if (!sc || sc.ronda !== 1) return NextResponse.json({ scores: {} })

  // Buscar la tarjeta ronda=2 del mismo jugador (control YO)
  const controlSc = await prisma.scorecard.findUnique({
    where: { tournamentId_playerId_ronda: { tournamentId: sc.tournamentId, playerId: sc.playerId, ronda: 2 } },
    select: { entries: { select: { holeId: true, golpes: true } } },
  })

  if (!controlSc) return NextResponse.json({ scores: {} })

  const scores: Record<number, number> = {}
  for (const e of controlSc.entries) scores[e.holeId] = e.golpes

  return NextResponse.json({ scores })
}
