import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

// GET /api/mobile/jugador?matricula=XXX
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const matricula = req.nextUrl.searchParams.get('matricula')
  if (!matricula) return NextResponse.json({ error: 'Matrícula requerida' }, { status: 400 })

  const player = await prisma.player.findUnique({
    where: { matricula },
    select: { id: true, nombre: true, apellido: true, hcpIndex: true, matricula: true, activo: true },
  })

  if (!player) return NextResponse.json({ error: `No se encontró matrícula ${matricula}` }, { status: 404 })
  if (!player.activo) return NextResponse.json({ error: `El jugador ${matricula} está inactivo` }, { status: 400 })

  return NextResponse.json(player)
}
