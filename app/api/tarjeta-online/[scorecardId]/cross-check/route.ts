import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Ctx = { params: Promise<{ scorecardId: string }> }

// GET /api/tarjeta-online/[scorecardId]/cross-check
// Devuelve los golpes que el propio jugador (JUG) anotó como YO en su tarjeta propia.
// Permite detectar inconsistencias entre lo que anotó el marcador y lo que anotó el jugador.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { scorecardId } = await params
  const sc = await prisma.scorecard.findUnique({
    where: { id: Number(scorecardId) },
    select: { tournamentId: true, playerId: true, marcadorPlayerId: true },
  })
  if (!sc) return NextResponse.json({ scores: {} })

  // Buscar la scorecard donde JUG se marcó a sí mismo (marcadorPlayerId = playerId)
  const selfSc = await prisma.scorecard.findFirst({
    where: {
      tournamentId:     sc.tournamentId,
      playerId:         sc.playerId,
      marcadorPlayerId: sc.playerId, // él mismo fue su marcador
      origenOnline:     true,
    },
    select: { entries: { select: { holeId: true, golpes: true } } },
  })

  if (!selfSc) return NextResponse.json({ scores: {} })

  const scores: Record<number, number> = {}
  for (const e of selfSc.entries) scores[e.holeId] = e.golpes

  return NextResponse.json({ scores })
}
