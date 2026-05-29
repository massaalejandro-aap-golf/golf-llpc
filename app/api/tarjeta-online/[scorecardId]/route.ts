import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

type Ctx = { params: Promise<{ scorecardId: string }> }

// GET /api/tarjeta-online/[scorecardId]
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { scorecardId } = await params
  const sc = await prisma.scorecard.findUnique({
    where: { id: Number(scorecardId) },
    include: {
      player:   { select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true, matricula: true } },
      marcador: { select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true, matricula: true } },
      tournament: {
        select: {
          id: true, nombre: true, tipo: true, hoyos: true,
          teeHombreId: true, teeDamaId: true,
          teeHombre: { select: { id: true, nombre: true, slope: true, rating: true } },
          teeDama:   { select: { id: true, nombre: true, slope: true, rating: true } },
          course: {
            select: {
              holes: {
                orderBy: { numero: 'asc' },
                select: {
                  id: true, numero: true, par: true, parDamas: true, handicapIndex: true, handicapIndexDamas: true,
                },
              },
            },
          },
        },
      },
      entries: { select: { holeId: true, golpes: true } },
    },
  })

  if (!sc) return NextResponse.json({ error: 'Tarjeta no encontrada' }, { status: 404 })

  // Solo el marcador (o admin/comision) puede ver/editar
  const isStaff = session.role === 'ADMIN' || session.role === 'COMISION'
  if (!isStaff && sc.marcadorPlayerId !== session.playerId && sc.playerId !== session.playerId) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  return NextResponse.json(sc)
}

// PATCH /api/tarjeta-online/[scorecardId] — guardar golpes
const SaveSchema = z.object({
  entries: z.array(z.object({ holeId: z.number().int(), golpes: z.number().int().min(1).max(20) })),
})

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { scorecardId } = await params
  const sc = await prisma.scorecard.findUnique({ where: { id: Number(scorecardId) } })
  if (!sc) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const isStaff = session.role === 'ADMIN' || session.role === 'COMISION'
  if (!isStaff && sc.marcadorPlayerId !== session.playerId) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  if (sc.onlineEstado === 'VALIDADA') {
    return NextResponse.json({ error: 'La tarjeta ya fue validada' }, { status: 409 })
  }

  const body = await req.json()
  const parsed = SaveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  for (const e of parsed.data.entries) {
    await prisma.scorecardEntry.upsert({
      where: { scorecardId_holeId: { scorecardId: Number(scorecardId), holeId: e.holeId } },
      update: { golpes: e.golpes },
      create: { scorecardId: Number(scorecardId), holeId: e.holeId, golpes: e.golpes },
    })
  }

  return NextResponse.json({ ok: true })
}
