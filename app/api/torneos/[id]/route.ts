import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/torneos/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const torneo = await prisma.tournament.findUnique({
    where: { id: Number(id) },
    include: {
      course: true,
      teeHombre: { select: { id: true, nombre: true, color: true, slope: true, rating: true } },
      teeDama:   { select: { id: true, nombre: true, color: true, slope: true, rating: true } },
      categories: { orderBy: [{ genero: 'asc' }, { nombre: 'asc' }] },
      teeTimeSlots: {
        orderBy: { hora: 'asc' },
        include: {
          players: {
            include: {
              player: { select: { id: true, nombre: true, apellido: true, hcpIndex: true } },
            },
          },
        },
      },
      scorecards: {
        include: {
          player: { select: { id: true, nombre: true, apellido: true } },
        },
      },
      _count: { select: { scorecards: true, teeTimeSlots: true } },
    },
  })

  if (!torneo) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }
  return NextResponse.json(torneo)
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const TIPO_VALUES = [
  'MEDAL', 'STABLEFORD', 'MATCH_PLAY', 'CHOICE_ECLECTIC', 'RANKING', 'GOLFER',
  'FOURBALL_AMERICANO', 'FOURBALL_CLASICO', 'FOURBALL_AGGREGATE', 'LAGUNEADA',
  'FOURSOME_CHAPMAN', 'FOURSOME_MIXED', 'FOURSOME', 'SCRAMBLE', 'PELOTERO',
] as const

const STATUS_VALUES = [
  'ACTIVO', 'EN_JUEGO', 'FINALIZADO', 'PROCESADO', 'POSPUESTO', 'SUSPENDIDO', 'CANCELADO',
] as const

const CategoriaSchema = z.object({
  genero:   z.enum(['DAMA', 'CABALLERO']),
  nombre:   z.string().min(1),
  scratch:  z.boolean().default(false),
  hcpDesde: z.number().nullable().optional(),
  hcpHasta: z.number().nullable().optional(),
})

const PatchSchema = z.object({
  // Estado
  status: z.enum(STATUS_VALUES).optional(),

  // Datos básicos
  nombre:            z.string().min(1).optional(),
  nombrePlanilla:    z.string().nullable().optional(),
  fecha:             z.string().refine((d) => !isNaN(Date.parse(d))).optional(),

  // Configuración de juego
  tipo:              z.enum(TIPO_VALUES).optional(),
  hoyos:             z.enum(['NINE', 'EIGHTEEN']).optional(),
  ronda:             z.string().optional(),
  jugadoresPorLinea: z.number().int().min(1).max(6).optional(),
  scoreMaxMedal:     z.boolean().optional(),
  aagEnabled:        z.boolean().optional(),
  reservasHabilitadas: z.boolean().optional(),

  // Cancha y tees
  courseId:          z.number().int().positive().optional(),
  teeHombreId:       z.number().int().positive().nullable().optional(),
  teeDamaId:         z.number().int().positive().nullable().optional(),

  // Categorías
  categorySetId:     z.number().int().positive().nullable().optional(),
  categorias:        z.array(CategoriaSchema).optional(),

  // Clima
  weatherDesc:       z.string().nullable().optional(),
  weatherTempC:      z.number().int().nullable().optional(),
  weatherVientoKmh:  z.number().int().nullable().optional(),
})

// PATCH /api/torneos/[id]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id } = await params
  const torneoId = Number(id)
  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { categorias, fecha, ...rest } = parsed.data

  // Build update data — only include explicitly provided fields (skip undefined)
  const updateData: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(rest)) {
    if (val !== undefined) updateData[key] = val
  }
  if (fecha !== undefined) updateData.fecha = new Date(fecha)

  try {
    // Update tournament fields
    const torneo = await prisma.tournament.update({
      where: { id: torneoId },
      data: updateData,
    })

    // Replace categories if provided (sequential — no interactive tx with driver adapter)
    if (categorias !== undefined) {
      await prisma.tournamentCategory.deleteMany({ where: { tournamentId: torneoId } })
      if (categorias.length > 0) {
        await prisma.tournamentCategory.createMany({
          data: categorias.map((c) => ({ ...c, tournamentId: torneoId })),
        })
      }
    }

    return NextResponse.json(torneo)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Error al actualizar', detail: msg }, { status: 500 })
  }
}

// DELETE /api/torneos/[id]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id } = await params
  try {
    await prisma.tournament.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Error al eliminar', detail: msg }, { status: 500 })
  }
}
