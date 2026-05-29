import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string }> }

const UpdateSchema = z.object({
  nombre:    z.string().min(1).optional(),
  apellido:  z.string().min(1).optional(),
  genero:    z.enum(['DAMA', 'CABALLERO']).optional(),
  hcpIndex:  z.number().min(0).max(54).optional(),
  tipo:      z.enum(['SOCIO', 'INVITADO', 'SOCIO_TEMPORARIO', 'INVITADO_TEMPORARIO']).optional(),
  matricula: z.string().nullable().optional(),
  email:     z.string().email().nullable().optional(),
  telefono:  z.string().nullable().optional(),
  dni:       z.string().nullable().optional(),
  fechaNac:  z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
  categoria: z.string().nullable().optional(),
  centroCosto: z.string().nullable().optional(),
  aagId:     z.string().nullable().optional(),
  activo:    z.boolean().optional(),
})

// GET /api/jugadores/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const jugador = await prisma.player.findUnique({ where: { id: Number(id) } })
  if (!jugador) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(jugador)
}

// PATCH /api/jugadores/[id]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.issues }, { status: 400 })
  }

  const jugador = await prisma.player.update({
    where: { id: Number(id) },
    data: parsed.data,
  })
  return NextResponse.json(jugador)
}
