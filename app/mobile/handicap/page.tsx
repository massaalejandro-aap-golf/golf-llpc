import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function courseHcp(hcpIndex: number, slope: number, rating: number, par: number): number {
  return Math.round(hcpIndex * slope / 113 + (rating - par))
}

export default async function HandicapPage() {
  const session = await requireSession()

  if (!session.playerId) {
    return (
      <div className="flex flex-col min-h-screen">
        <MobileHeader title="Handicap de juego" />
        <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
          <div>
            <p className="text-4xl mb-4">⚠️</p>
            <p className="font-medium">Tu usuario no tiene un jugador asociado.</p>
            <p className="text-sm mt-2">Contactá al administrador del club.</p>
          </div>
        </div>
        <BackButton />
      </div>
    )
  }

  const player = await prisma.player.findUnique({
    where: { id: session.playerId },
    select: { matricula: true, nombre: true, apellido: true, hcpIndex: true, genero: true },
  })

  if (!player) redirect('/mobile')

  // Buscar tee blanco para el género del jugador
  const teeBlanco = await prisma.courseTee.findFirst({
    where: { nombre: { contains: 'blanco', mode: 'insensitive' } },
    select: { nombre: true, slope: true, rating: true, courseId: true },
  }) ?? await prisma.courseTee.findFirst({
    select: { nombre: true, slope: true, rating: true, courseId: true },
    orderBy: { id: 'asc' },
  })

  // Calcular par desde los hoyos de la cancha
  let par18 = 72
  if (teeBlanco) {
    const hoyos = await prisma.hole.findMany({
      where: { courseId: teeBlanco.courseId },
      select: { par: true },
    })
    if (hoyos.length > 0) par18 = hoyos.reduce((a, h) => a + h.par, 0)
  }

  const slope  = teeBlanco?.slope  ?? 113
  const rating = teeBlanco?.rating ?? 72

  const ch100 = teeBlanco ? courseHcp(player.hcpIndex, slope, rating, par18) : null
  const ch85  = ch100 !== null ? Math.ceil(ch100 * 0.85) : null

  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="Handicap de juego" />

      <div className="flex-1 px-4 py-6 space-y-4">
        {/* Datos del jugador */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{player.apellido}, {player.nombre}</p>
            {player.matricula && (
              <p className="text-gray-500 text-sm mt-1">
                Matrícula AAG: <span className="font-semibold text-gray-700">{player.matricula}</span>
              </p>
            )}
          </div>
          <div className="border-t border-gray-100 pt-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Handicap Index</p>
            <p className="text-5xl font-bold text-green-700 mt-1">{player.hcpIndex.toFixed(1)}</p>
          </div>
        </div>

        {/* Handicap de juego */}
        {teeBlanco && ch100 !== null && ch85 !== null ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wide">
              Handicap de juego — Tee {teeBlanco.nombre}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">100%</p>
                <p className="text-4xl font-bold text-green-800 mt-1">{ch100}</p>
                <p className="text-xs text-green-600 mt-1">Allowance completo</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">85%</p>
                <p className="text-4xl font-bold text-blue-800 mt-1">{ch85}</p>
                <p className="text-xs text-blue-600 mt-1">Medal / Stableford</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              Slope {slope} · Rating {rating} · Par {par18}
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center text-yellow-800 text-sm">
            No se encontró el tee blanco configurado en el sistema.
          </div>
        )}
      </div>

      <BackButton />
    </div>
  )
}

function MobileHeader({ title }: { title: string }) {
  return (
    <div className="bg-green-700 text-white px-6 pt-10 pb-6">
      <p className="text-green-200 text-sm font-medium tracking-wide uppercase">La Lucila Golf Club</p>
      <h1 className="text-xl font-bold mt-1">{title}</h1>
    </div>
  )
}

function BackButton() {
  return (
    <div className="p-4">
      <Link
        href="/mobile"
        className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-5 py-4 font-semibold active:scale-95 transition-transform"
      >
        ← Volver al menú
      </Link>
    </div>
  )
}
