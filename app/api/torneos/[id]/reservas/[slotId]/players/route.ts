import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string; slotId: string }> }

const AddPlayerSchema = z.object({
  playerId: z.number().int().positive(),
  carro: z.boolean().default(false),
})

// POST /api/torneos/[id]/reservas/[slotId]/players — agregar jugador al turno
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id, slotId } = await params
  const body = await req.json()
  const parsed = AddPlayerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  // Verificar límite de jugadores por línea
  const torneo = await prisma.tournament.findFirst({
    where: { id: Number(id) },
    select: { jugadoresPorLinea: true },
  })
  if (!torneo) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })

  const currentCount = await prisma.teeTimeSlotPlayer.count({
    where: { teeTimeSlotId: Number(slotId) },
  })
  if (currentCount >= torneo.jugadoresPorLinea) {
    return NextResponse.json(
      { error: `El turno ya tiene el máximo de ${torneo.jugadoresPorLinea} jugadores` },
      { status: 409 }
    )
  }

  // Verificar que el jugador no esté ya en otro turno de este torneo
  const yaInscripto = await prisma.teeTimeSlotPlayer.findFirst({
    where: {
      playerId: parsed.data.playerId,
      teeTimeSlot: { tournamentId: Number(id) },
    },
  })
  if (yaInscripto) {
    return NextResponse.json(
      { error: 'El jugador ya está inscripto en otro turno de este torneo' },
      { status: 409 }
    )
  }

  const entry = await prisma.teeTimeSlotPlayer.create({
    data: {
      teeTimeSlotId: Number(slotId),
      playerId: parsed.data.playerId,
      carro: parsed.data.carro,
    },
    include: {
      player: { select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true } },
    },
  })

  return NextResponse.json(entry, { status: 201 })
}

// DELETE /api/torneos/[id]/reservas/[slotId]/players?playerId=X — quitar jugador
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { slotId } = await params
  const { searchParams } = new URL(req.url)
  const playerId = Number(searchParams.get('playerId'))

  if (!playerId) return NextResponse.json({ error: 'playerId requerido' }, { status: 400 })

  await prisma.teeTimeSlotPlayer.deleteMany({
    where: { teeTimeSlotId: Number(slotId), playerId },
  })

  return NextResponse.json({ ok: true })
}
