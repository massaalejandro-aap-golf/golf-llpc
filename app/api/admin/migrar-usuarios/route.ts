import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { ensurePlayerUser } from '@/lib/player-user'

// POST /api/admin/migrar-usuarios
// Crea Users SOCIO para todos los Players con matrícula que aún no tengan User.
export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const players = await prisma.player.findMany({
    where: { matricula: { not: null } },
    select: { id: true, matricula: true, nombre: true, apellido: true },
  })

  let creados = 0
  let omitidos = 0

  for (const p of players) {
    const antes = await prisma.user.count({ where: { OR: [{ email: p.matricula! }, { playerId: p.id }] } })
    if (antes > 0) { omitidos++; continue }
    await ensurePlayerUser(p)
    creados++
  }

  return NextResponse.json({ ok: true, creados, omitidos, total: players.length })
}
