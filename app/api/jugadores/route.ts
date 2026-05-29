import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const JugadorSchema = z.object({
  nombre:    z.string().min(1),
  apellido:  z.string().min(1),
  genero:    z.enum(['DAMA', 'CABALLERO']),
  hcpIndex:  z.number().min(0).max(54).default(36),
  tipo:      z.enum(['SOCIO', 'INVITADO', 'SOCIO_TEMPORARIO', 'INVITADO_TEMPORARIO']).default('SOCIO'),
  matricula: z.string().nullable().optional(),
  email:     z.string().email().nullable().optional(),
  telefono:  z.string().nullable().optional(),
  dni:       z.string().nullable().optional(),
  fechaNac:  z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
  categoria: z.string().nullable().optional(),
  centroCosto: z.string().nullable().optional(),
  aagId:     z.string().nullable().optional(),
  activo:    z.boolean().default(true),
})

// GET /api/jugadores?q=texto&genero=DAMA|CABALLERO&take=20
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const genero = searchParams.get('genero') ?? ''
  const take = Math.min(Number(searchParams.get('take') ?? '20'), 50)

  const jugadores = await prisma.player.findMany({
    where: {
      activo: true,
      ...(q && {
        OR: [
          { apellido: { contains: q, mode: 'insensitive' } },
          { nombre:   { contains: q, mode: 'insensitive' } },
          { matricula: { contains: q, mode: 'insensitive' } },
        ],
      }),
      ...(genero && { genero: genero as 'DAMA' | 'CABALLERO' }),
    },
    select: {
      id: true,
      matricula: true,
      nombre: true,
      apellido: true,
      hcpIndex: true,
      genero: true,
      tipo: true,
    },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    take,
  })

  return NextResponse.json(jugadores)
}

// POST /api/jugadores — crear jugador
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = JugadorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.issues }, { status: 400 })
  }

  // Matrícula única: verificar si ya existe
  if (parsed.data.matricula) {
    const existing = await prisma.player.findUnique({ where: { matricula: parsed.data.matricula } })
    if (existing) {
      return NextResponse.json({ error: `La matrícula ${parsed.data.matricula} ya está registrada` }, { status: 409 })
    }
  }

  const jugador = await prisma.player.create({ data: parsed.data })
  return NextResponse.json(jugador, { status: 201 })
}
