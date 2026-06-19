import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

function courseHcp(hcpIndex: number, slope: number, rating: number, par: number): number {
  return Math.round(hcpIndex * slope / 113 + (rating - par))
}

// GET /api/mobile/handicap?matricula=XXX
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const matricula = req.nextUrl.searchParams.get('matricula')
  if (!matricula) return NextResponse.json({ error: 'Matrícula requerida' }, { status: 400 })

  const player = await prisma.player.findUnique({
    where: { matricula },
    select: { matricula: true, nombre: true, apellido: true, hcpIndex: true, genero: true },
  })

  if (!player) return NextResponse.json({ error: `No se encontró un jugador con matrícula ${matricula}` }, { status: 404 })

  // Tee blanco
  const teeBlanco = await prisma.courseTee.findFirst({
    where: { nombre: { contains: 'blanco', mode: 'insensitive' } },
    select: { nombre: true, slope: true, rating: true, courseId: true },
  }) ?? await prisma.courseTee.findFirst({
    select: { nombre: true, slope: true, rating: true, courseId: true },
    orderBy: { id: 'asc' },
  })

  let par18 = 72
  if (teeBlanco) {
    const hoyos = await prisma.hole.findMany({ where: { courseId: teeBlanco.courseId }, select: { par: true } })
    if (hoyos.length > 0) par18 = hoyos.reduce((a, h) => a + h.par, 0)
  }

  const slope  = teeBlanco?.slope  ?? 113
  const rating = teeBlanco?.rating ?? 72
  const ch100  = courseHcp(player.hcpIndex, slope, rating, par18)
  const ch85   = Math.ceil(ch100 * 0.85)

  return NextResponse.json({
    matricula: player.matricula,
    nombre: player.nombre,
    apellido: player.apellido,
    hcpIndex: player.hcpIndex,
    teeNombre: teeBlanco?.nombre ?? 'Blanco',
    slope, rating, par: par18,
    ch100, ch85,
  })
}
