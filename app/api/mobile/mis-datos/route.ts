import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const UpdateSchema = z.object({
  email:    z.string().email().nullable().optional(),
  telefono: z.string().nullable().optional(),
  dni:      z.string().nullable().optional(),
  fechaNac: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
})

// GET /api/mobile/mis-datos — datos del jugador del usuario logueado
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!session.playerId) return NextResponse.json({ error: 'Sin jugador asociado' }, { status: 404 })

  const player = await prisma.player.findUnique({
    where: { id: session.playerId },
    select: {
      id: true, nombre: true, apellido: true, matricula: true,
      hcpIndex: true, genero: true, tipo: true,
      email: true, telefono: true, dni: true, fechaNac: true,
      categoria: true, activo: true,
    },
  })

  if (!player) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(player)
}

// PATCH /api/mobile/mis-datos — SOCIO actualiza sus propios datos de contacto
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!session.playerId) return NextResponse.json({ error: 'Sin jugador asociado' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const player = await prisma.player.update({
    where: { id: session.playerId },
    data: parsed.data,
  })

  return NextResponse.json(player)
}
