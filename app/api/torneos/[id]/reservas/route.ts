import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/torneos/[id]/reservas
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const slots = await prisma.teeTimeSlot.findMany({
    where: { tournamentId: Number(id) },
    orderBy: { hora: 'asc' },
    include: {
      players: {
        include: {
          player: {
            select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  })
  return NextResponse.json(slots)
}

const GenerateSchema = z.object({
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  intervaloMin: z.number().int().min(1).max(60),
  cantidad: z.number().int().min(1).max(120),
  hoyoSalida: z.number().int().min(1).max(18).default(1),
  clearExisting: z.boolean().default(false),
})

// POST /api/torneos/[id]/reservas — generar planilla
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id } = await params
  const torneoId = Number(id)

  const body = await req.json()
  const parsed = GenerateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.issues }, { status: 400 })
  }

  const { horaInicio, intervaloMin, cantidad, hoyoSalida, clearExisting } = parsed.data

  const torneo = await prisma.tournament.findUnique({ where: { id: torneoId }, select: { fecha: true } })
  if (!torneo) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })

  // Check if slots exist
  const existingCount = await prisma.teeTimeSlot.count({ where: { tournamentId: torneoId } })
  if (existingCount > 0 && !clearExisting) {
    return NextResponse.json(
      { error: 'Ya existe una planilla. Enviá clearExisting: true para reemplazarla.' },
      { status: 409 }
    )
  }

  // Build slot datetimes: use tournament date + input time
  // Argentina is UTC-3 (no DST since 2008), so add 3h to convert local → UTC
  const fecha = new Date(torneo.fecha)
  const [hh, mm] = horaInicio.split(':').map(Number)
  const ARGENTINA_UTC_OFFSET = 3

  const baseTime = new Date(Date.UTC(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate(),
    hh + ARGENTINA_UTC_OFFSET,
    mm
  ))

  const slotsData = Array.from({ length: cantidad }, (_, i) => ({
    tournamentId: torneoId,
    hora: new Date(baseTime.getTime() + i * intervaloMin * 60 * 1000),
    hoyoSalida,
    bloqueado: false,
  }))

  try {
    if (clearExisting) {
      await prisma.teeTimeSlot.deleteMany({ where: { tournamentId: torneoId } })
    }
    await prisma.teeTimeSlot.createMany({ data: slotsData })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST reservas] Error al crear slots:', msg)
    return NextResponse.json({ error: 'Error al generar la planilla', detail: msg }, { status: 500 })
  }

  const slots = await prisma.teeTimeSlot.findMany({
    where: { tournamentId: torneoId },
    orderBy: { hora: 'asc' },
    include: {
      players: {
        include: {
          player: { select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true } },
        },
      },
    },
  })

  return NextResponse.json(slots, { status: 201 })
}

// DELETE /api/torneos/[id]/reservas — limpiar toda la planilla
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id } = await params
  await prisma.teeTimeSlot.deleteMany({ where: { tournamentId: Number(id) } })
  return NextResponse.json({ ok: true })
}
