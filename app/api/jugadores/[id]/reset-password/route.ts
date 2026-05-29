import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/jugadores/[id]/reset-password
// Resetea la contraseña del User vinculado al Player a su matrícula.
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id } = await params
  const player = await prisma.player.findUnique({
    where: { id: Number(id) },
    select: { id: true, matricula: true, nombre: true, apellido: true },
  })
  if (!player) return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
  if (!player.matricula) return NextResponse.json({ error: 'El jugador no tiene matrícula' }, { status: 400 })

  const user = await prisma.user.findFirst({ where: { playerId: player.id } })
  if (!user) return NextResponse.json({ error: 'El jugador no tiene usuario en el sistema' }, { status: 404 })

  const hashed = await bcrypt.hash(player.matricula, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
