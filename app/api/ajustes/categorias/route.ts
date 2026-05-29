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

const SetSchema = z.object({
  nombre:      z.string().min(1),
  descripcion: z.string().nullable().optional(),
  categories:  z.array(TemplateSchema).min(1),
})

async function canEdit() {
  const s = await getSession()
  return s && (s.role === 'ADMIN' || s.role === 'COMISION')
}

// GET /api/ajustes/categorias
export async function GET() {
  const sets = await prisma.categorySet.findMany({
    where: { activo: true },
    include: { categories: { orderBy: [{ genero: 'asc' }, { orden: 'asc' }] } },
    orderBy: { nombre: 'asc' },
  })
  return NextResponse.json(sets)
}

// POST /api/ajustes/categorias
export async function POST(req: NextRequest) {
  if (!await canEdit()) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  const body = SetSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Datos inválidos', issues: body.error.issues }, { status: 400 })

  const { categories, ...setData } = body.data
  const set = await prisma.categorySet.create({
    data: {
      ...setData,
      categories: { create: categories },
    },
    include: { categories: { orderBy: [{ genero: 'asc' }, { orden: 'asc' }] } },
  })
  return NextResponse.json(set, { status: 201 })
}
