import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

// POST /api/mi-cuenta/password
// El jugador logueado cambia su propia contraseña.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { actual, nueva } = await req.json()
  if (!actual || !nueva || nueva.length < 4) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const valid = await bcrypt.compare(actual, user.password)
  if (!valid) return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })

  const hashed = await bcrypt.hash(nueva, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
