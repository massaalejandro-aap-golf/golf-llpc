/**
 * POST /api/jugadores/normalizar-nombres
 *
 * Recorre todos los jugadores y aplica fixName() a nombre y apellido.
 * Convierte a Title Case (primera letra mayúscula, resto minúsculas) y separa CamelCase.
 * Solo actualiza los registros donde el valor cambia.
 * Requiere rol ADMIN o COMISION.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { fixName } from '@/lib/aag-sync'

export async function POST() {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const players = await prisma.player.findMany({
    select: { id: true, nombre: true, apellido: true },
  })

  let fixed = 0
  const changes: { id: number; antes: string; despues: string }[] = []

  for (const p of players) {
    const nombre   = fixName(p.nombre)
    const apellido = fixName(p.apellido)

    if (nombre !== p.nombre || apellido !== p.apellido) {
      await prisma.player.update({
        where: { id: p.id },
        data:  { nombre, apellido },
      })
      changes.push({
        id:     p.id,
        antes:  `${p.apellido}, ${p.nombre}`,
        despues:`${apellido}, ${nombre}`,
      })
      fixed++
    }
  }

  return NextResponse.json({
    total:   players.length,
    fixed,
    changes,
  })
}
