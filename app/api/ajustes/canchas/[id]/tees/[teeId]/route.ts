import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const UpdateTeeSchema = z.object({
  nombre:      z.string().min(1).max(30).optional(),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  slope:       z.number().int().min(55).max(155).nullable().optional(),
  slopeIda:    z.number().int().min(55).max(155).nullable().optional(),
  slopeVuelta: z.number().int().min(55).max(155).nullable().optional(),
  rating:      z.number().min(55).max(85).nullable().optional(),
})

async function canEdit() {
  const s = await getSession()
  return s && (s.role === 'ADMIN' || s.role === 'COMISION')
}

// PATCH /api/ajustes/canchas/[id]/tees/[teeId]
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; teeId: string }> }) {
  if (!await canEdit()) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  const { teeId } = await props.params
  const body = UpdateTeeSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const tee = await prisma.courseTee.update({
    where: { id: Number(teeId) },
    data: body.data,
  })
  return NextResponse.json(tee)
}

// DELETE /api/ajustes/canchas/[id]/tees/[teeId]
export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string; teeId: string }> }) {
  if (!await canEdit()) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  const { teeId } = await props.params
  await prisma.courseTee.delete({ where: { id: Number(teeId) } })
  return new NextResponse(null, { status: 204 })
}
