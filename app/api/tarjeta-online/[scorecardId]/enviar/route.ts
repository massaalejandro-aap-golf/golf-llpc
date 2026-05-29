import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Ctx = { params: Promise<{ scorecardId: string }> }

// POST /api/tarjeta-online/[scorecardId]/enviar — marcar como COMPLETA y borrar tarjeta de control (ronda=2)
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { scorecardId } = await params
  const sc = await prisma.scorecard.findUnique({ where: { id: Number(scorecardId) } })
  if (!sc) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const isStaff = session.role === 'ADMIN' || session.role === 'COMISION'
  if (!isStaff && sc.marcadorPlayerId !== session.playerId) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await prisma.scorecard.update({
    where: { id: Number(scorecardId) },
    data: { onlineEstado: 'COMPLETA' },
  })

  // Borrar la tarjeta de control (ronda=2) del marcador — ya no es necesaria
  if (sc.marcadorPlayerId) {
    await prisma.scorecard.deleteMany({
      where: {
        tournamentId: sc.tournamentId,
        playerId:     sc.marcadorPlayerId,
        ronda:        2,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
