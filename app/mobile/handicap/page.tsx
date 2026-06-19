import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import HandicapBuscador from './HandicapBuscador'

export const dynamic = 'force-dynamic'

function courseHcp(hcpIndex: number, slope: number, rating: number, par: number): number {
  return Math.round(hcpIndex * slope / 113 + (rating - par))
}

export default async function HandicapPage() {
  const session = await requireSession()

  // Tee blanco y par
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

  // Jugador propio (puede ser null si el user no tiene player)
  const myPlayer = session.playerId
    ? await prisma.player.findUnique({
        where: { id: session.playerId },
        select: { matricula: true, nombre: true, apellido: true, hcpIndex: true },
      })
    : null

  const myHandicap = myPlayer
    ? {
        matricula:  myPlayer.matricula,
        nombre:     myPlayer.nombre,
        apellido:   myPlayer.apellido,
        hcpIndex:   myPlayer.hcpIndex,
        teeNombre:  teeBlanco?.nombre ?? 'Blanco',
        slope, rating, par: par18,
        ch100: courseHcp(myPlayer.hcpIndex, slope, rating, par18),
        ch85:  Math.ceil(courseHcp(myPlayer.hcpIndex, slope, rating, par18) * 0.85),
      }
    : null

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-green-700 text-white px-6 pt-10 pb-6">
        <p className="text-green-200 text-sm font-medium tracking-wide uppercase">La Lucila Golf Club</p>
        <h1 className="text-xl font-bold mt-1">Handicap de juego</h1>
      </div>

      <div className="flex-1 px-4 py-5">
        <HandicapBuscador myHandicap={myHandicap} />
      </div>

      <div className="p-4">
        <Link
          href="/mobile"
          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-5 py-4 font-semibold active:scale-95 transition-transform"
        >
          ← Volver al menú
        </Link>
      </div>
    </div>
  )
}
