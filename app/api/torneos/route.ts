import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const CategoriaSchema = z.object({
  genero: z.enum(['DAMA', 'CABALLERO']),
  nombre: z.string().min(1),
  scratch: z.boolean().default(false),
  hcpDesde: z.number().nullable().optional(),
  hcpHasta: z.number().nullable().optional(),
})

const TorneoSchema = z.object({
  nombre: z.string().min(1),
  nombrePlanilla: z.string().nullable().optional(),
  fecha: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Fecha inválida' }),
  tipo: z.enum([
    'MEDAL', 'STABLEFORD', 'MATCH_PLAY', 'CHOICE_ECLECTIC', 'RANKING', 'GOLFER',
    'FOURBALL_AMERICANO', 'FOURBALL_CLASICO', 'FOURBALL_AGGREGATE', 'LAGUNEADA',
    'FOURSOME_CHAPMAN', 'FOURSOME_MIXED', 'FOURSOME', 'SCRAMBLE', 'PELOTERO',
  ]).default('MEDAL'),
  hoyos: z.enum(['NINE', 'EIGHTEEN']).default('EIGHTEEN'),
  ronda: z.string().default('Única'),
  jugadoresPorLinea: z.number().int().min(1).max(6).default(4),
  scoreMaxMedal: z.boolean().default(false),
  aagEnabled: z.boolean().default(true),
  reservasHabilitadas: z.boolean().default(false),
  courseId: z.number().int().positive(),
  teeHombreId: z.number().int().positive().nullable().optional(),
  teeDamaId: z.number().int().positive().nullable().optional(),
  categorySetId: z.number().int().positive().nullable().optional(),
  categorias: z.array(CategoriaSchema).min(1),
})

// GET /api/torneos — lista de torneos
export async function GET() {
  const torneos = await prisma.tournament.findMany({
    orderBy: { fecha: 'desc' },
    include: {
      course: { select: { nombre: true } },
      categories: true,
      _count: { select: { scorecards: true } },
    },
  })
  return NextResponse.json(torneos)
}

// POST /api/torneos — crear torneo
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = TorneoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { categorias, ...torneoData } = parsed.data

  try {
    const torneo = await prisma.tournament.create({
      data: {
        ...torneoData,
        fecha: new Date(torneoData.fecha),
        categories: {
          create: categorias,
        },
      },
      include: { categories: true },
    })
    return NextResponse.json(torneo, { status: 201 })
  } catch (e) {
    console.error('[POST /api/torneos] Prisma error:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Error al crear el torneo', detail: msg }, { status: 500 })
  }
}
