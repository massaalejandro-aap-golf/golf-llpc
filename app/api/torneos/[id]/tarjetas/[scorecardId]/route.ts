import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string; scorecardId: string }> }

// GET /api/torneos/[id]/tarjetas/[scorecardId]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { scorecardId } = await params
  const scorecard = await prisma.scorecard.findUnique({
    where: { id: Number(scorecardId) },
    include: {
      player: { select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true } },
      entries: {
        include: {
          hole: { select: { id: true, numero: true, par: true, handicapIndex: true } },
        },
        orderBy: { hole: { numero: 'asc' } },
      },
    },
  })
  if (!scorecard) return NextResponse.json({ error: 'Tarjeta no encontrada' }, { status: 404 })
  return NextResponse.json(scorecard)
}

const SaveEntriesSchema = z.object({
  entries: z.array(
    z.object({
      holeId: z.number().int().positive(),
      golpes: z.number().int().min(1).max(20),
    })
  ).min(1),
})

// PATCH /api/torneos/[id]/tarjetas/[scorecardId] — guardar entradas (upsert)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { scorecardId } = await params
  const body = await req.json()
  const parsed = SaveEntriesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.issues }, { status: 400 })
  }

  const scId = Number(scorecardId)

  await prisma.$transaction(
    parsed.data.entries.map(({ holeId, golpes }) =>
      prisma.scorecardEntry.upsert({
        where: { scorecardId_holeId: { scorecardId: scId, holeId } },
        update: { golpes },
        create: { scorecardId: scId, holeId, golpes },
      })
    )
  )

  const updated = await prisma.scorecard.findUnique({
    where: { id: scId },
    include: {
      entries: {
        include: { hole: { select: { id: true, numero: true, par: true, handicapIndex: true } } },
        orderBy: { hole: { numero: 'asc' } },
      },
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/torneos/[id]/tarjetas/[scorecardId]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { scorecardId } = await params
  await prisma.scorecard.delete({ where: { id: Number(scorecardId) } })
  return NextResponse.json({ ok: true })
}
