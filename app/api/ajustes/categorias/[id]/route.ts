import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const TemplateSchema = z.object({
  genero:   z.enum(['DAMA', 'CABALLERO']),
  nombre:   z.string().min(1),
  scratch:  z.boolean().default(false),
  hcpDesde: z.number().nullable().optional(),
  hcpHasta: z.number().nullable().optional(),
  orden:    z.number().int().default(0),
})

const UpdateSchema = z.object({
  nombre:      z.string().min(1).optional(),
  descripcion: z.string().nullable().optional(),
  activo:      z.boolean().optional(),
  categories:  z.array(TemplateSchema).min(1).optional(),
})

async function canEdit() {
  const s = await getSession()
  return s && (s.role === 'ADMIN' || s.role === 'COMISION')
}

// GET /api/ajustes/categorias/[id]
export async function GET(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const set = await prisma.categorySet.findUnique({
    where: { id: Number(id) },
    include: { categories: { orderBy: [{ genero: 'asc' }, { orden: 'asc' }] } },
  })
  if (!set) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(set)
}

// PATCH /api/ajustes/categorias/[id]
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!await canEdit()) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  const { id } = await props.params
  const body = UpdateSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { categories, ...setData } = body.data

  if (categories) {
    await prisma.categoryTemplate.deleteMany({ where: { setId: Number(id) } })
    await prisma.categoryTemplate.createMany({
      data: categories.map((c) => ({ ...c, setId: Number(id) })),
    })
  }
  const set = await prisma.categorySet.update({
    where: { id: Number(id) },
    data: setData,
    include: { categories: { orderBy: [{ genero: 'asc' }, { orden: 'asc' }] } },
  })

  return NextResponse.json(set)
}

// DELETE /api/ajustes/categorias/[id]
export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!await canEdit()) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  const { id } = await props.params
  await prisma.categorySet.update({ where: { id: Number(id) }, data: { activo: false } })
  return new NextResponse(null, { status: 204 })
}
