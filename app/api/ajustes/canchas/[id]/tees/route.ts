import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const TeeSchema = z.object({
  nombre:      z.string().min(1).max(30),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
  slope:       z.number().int().min(55).max(155).nullable().optional(),
  slopeIda:    z.number().int().min(55).max(155).nullable().optional(),
  slopeVuelta: z.number().int().min(55).max(155).nullable().optional(),
  rating:      z.number().min(55).max(85).nullable().optional(),
})

async function canEdit() {
  const s = await getSession()
  return s && (s.role === 'ADMIN' || s.role === 'COMISION')
}

// GET /api/ajustes/canchas/[id]/tees
export async function GET(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const tees = await prisma.courseTee.findMany({
    where: { courseId: Number(id) },
    include: { hoyos: { include: { hole: { select: { numero: true, par: true, handicapIndex: true } } } } },
    orderBy: { nombre: 'asc' },
  })
  return NextResponse.json(tees)
}

// POST /api/ajustes/canchas/[id]/tees — crear tee
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!await canEdit()) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  const { id } = await props.params
  const body = TeeSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const tee = await prisma.courseTee.create({
    data: { courseId: Number(id), ...body.data },
  })
  return NextResponse.json(tee, { status: 201 })
}
