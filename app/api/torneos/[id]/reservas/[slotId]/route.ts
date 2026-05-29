import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string; slotId: string }> }

const PatchSchema = z.object({
  bloqueado: z.boolean().optional(),
  hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  hoyoSalida: z.number().int().min(1).max(18).optional(),
})

// PATCH /api/torneos/[id]/reservas/[slotId]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { slotId } = await params
  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.bloqueado !== undefined) updateData.bloqueado = parsed.data.bloqueado
  if (parsed.data.hoyoSalida !== undefined) updateData.hoyoSalida = parsed.data.hoyoSalida

  const slot = await prisma.teeTimeSlot.update({
    where: { id: Number(slotId) },
    data: updateData,
  })

  return NextResponse.json(slot)
}

// DELETE /api/torneos/[id]/reservas/[slotId]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { slotId } = await params
  await prisma.teeTimeSlot.delete({ where: { id: Number(slotId) } })
  return NextResponse.json({ ok: true })
}
