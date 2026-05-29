import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/torneos/[id]/tarjetas-online — tarjetas online del torneo (solo admin/comision)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id } = await params
  const scorecards = await prisma.scorecard.findMany({
    where: { tournamentId: Number(id), origenOnline: true, ronda: 1 },
    orderBy: { id: 'desc' },
    include: {
      player:   { select: { matricula: true, nombre: true, apellido: true } },
      marcador: { select: { matricula: true, nombre: true, apellido: true } },
      entries:  { orderBy: { holeId: 'asc' }, select: { holeId: true, golpes: true } },
    },
  })

  return NextResponse.json(scorecards)
}
