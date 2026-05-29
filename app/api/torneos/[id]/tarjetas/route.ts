import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/torneos/[id]/tarjetas
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const scorecards = await prisma.scorecard.findMany({
    where: { tournamentId: Number(id), ronda: 1 },
    orderBy: { id: 'asc' },
    include: {
      player: { select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true } },
      _count: { select: { entries: true } },
    },
  })
  return NextResponse.json(scorecards)
}

const CreateSchema = z.object({
  playerId: z.number().int().positive(),
  ronda: z.number().int().min(1).default(1),
})

// POST /api/torneos/[id]/tarjetas — crear tarjeta (vacía) para un jugador
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.issues }, { status: 400 })
  }

  // Verificar que no exista ya tarjeta para este jugador+ronda en este torneo
  const existing = await prisma.scorecard.findUnique({
    where: {
      tournamentId_playerId_ronda: {
        tournamentId: Number(id),
        playerId: parsed.data.playerId,
        ronda: parsed.data.ronda,
      },
    },
  })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe una tarjeta para este jugador en esta ronda', id: existing.id }, { status: 409 })
  }

  const scorecard = await prisma.scorecard.create({
    data: {
      tournamentId: Number(id),
      playerId: parsed.data.playerId,
      ronda: parsed.data.ronda,
    },
    include: {
      player: { select: { id: true, nombre: true, apellido: true, hcpIndex: true } },
    },
  })

  return NextResponse.json(scorecard, { status: 201 })
}
