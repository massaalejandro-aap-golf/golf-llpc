import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string; slotId: string }> }

const AddPlayerSchema = z.object({
  playerId: z.number().int().positive(),
  carro: z.boolean().default(false),
})

const MAX_RESERVAS_SOCIO = 4

// POST /api/torneos/[id]/reservas/[slotId]/players — agregar jugador al turno
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const isStaff = session.role === 'ADMIN' || session.role === 'COMISION'

  const { id, slotId } = await params
  const body = await req.json()
  const parsed = AddPlayerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  // SOCIO solo puede agregarse a sí mismo
  if (!isStaff) {
    if (!session.playerId || parsed.data.playerId !== session.playerId) {
      return NextResponse.json({ error: 'Solo podés reservar para vos mismo' }, { status: 403 })
    }
    // Verificar límite de 4 reservas por torneo
    const reservasDelSocio = await prisma.teeTimeSlotPlayer.count({
      where: {
        playerId: session.playerId,
        teeTimeSlot: { tournamentId: Number(id) },
      },
    })
    if (reservasDelSocio >= MAX_RESERVAS_SOCIO) {
      return NextResponse.json(
        { error: `Ya tenés el máximo de ${MAX_RESERVAS_SOCIO} reservas para este torneo` },
        { status: 409 }
      )
    }
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
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const isStaff = session.role === 'ADMIN' || session.role === 'COMISION'
  const { searchParams } = new URL(req.url)
  const playerId = Number(searchParams.get('playerId'))

  // SOCIO solo puede quitarse a sí mismo
  if (!isStaff && (!session.playerId || playerId !== session.playerId)) {
    return NextResponse.json({ error: 'Solo podés cancelar tu propia reserva' }, { status: 403 })
  }

  const { slotId } = await params
  if (!playerId) return NextResponse.json({ error: 'playerId requerido' }, { status: 400 })

  await prisma.teeTimeSlotPlayer.deleteMany({
    where: { teeTimeSlotId: Number(slotId), playerId },
  })

  return NextResponse.json({ ok: true })
}
