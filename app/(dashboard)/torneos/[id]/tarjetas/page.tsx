import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import NuevaTarjetaButton from './NuevaTarjetaButton'
import DeleteScorecardButton from './DeleteScorecardButton'

export default async function TarjetasPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await requireSession()
  const canEdit = session.role === 'ADMIN' || session.role === 'COMISION'

  const torneo = await prisma.tournament.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      nombre: true,
      fecha: true,
      tipo: true,
      hoyos: true,
      teeHombre: { select: { slope: true, rating: true } },
      teeDama:   { select: { slope: true, rating: true } },
      course: {
        select: { holes: { select: { par: true, numero: true } } },
      },
      teeTimeSlots: {
        include: {
          players: {
            include: {
              player: { select: { id: true, nombre: true, apellido: true, matricula: true, hcpIndex: true, genero: true } },
            },
          },
        },
      },
      scorecards: {
        orderBy: { id: 'asc' },
        include: {
          player: { select: { id: true, nombre: true, apellido: true, matricula: true, hcpIndex: true, genero: true } },
          entries: { select: { golpes: true } },
          _count: { select: { entries: true } },
        },
      },
    },
  })

  if (!torneo) notFound()

  // Jugadores únicos de los tee times
  const jugadoresMap = new Map<number, {
    id: number; nombre: string; apellido: string; matricula: string | null; hcpIndex: number; genero: string
  }>()
  for (const slot of torneo.teeTimeSlots) {
    for (const sp of slot.players) {
      jugadoresMap.set(sp.player.id, sp.player)
    }
  }
  const jugadores = Array.from(jugadoresMap.values())
    .sort((a, b) => a.apellido.localeCompare(b.apellido))

  // Mapa de tarjetas por jugador
  const tarjetaByPlayer = new Map(torneo.scorecards.map((sc) => [sc.playerId, sc]))

  // Total de hoyos en el torneo
  const totalHoyos = torneo.hoyos === 'EIGHTEEN' ? 18 : 9

  // Par total según cantidad de hoyos jugados
  const holesInPlay = torneo.hoyos === 'EIGHTEEN'
    ? torneo.course.holes
    : torneo.course.holes.filter((h) => h.numero <= 9)
  const parTotal = holesInPlay.reduce((a, h) => a + h.par, 0)

  function calcScores(sc: NonNullable<typeof torneo>['scorecards'][number]) {
    const gross = sc.entries.reduce((a, e) => a + e.golpes, 0)
    const tee = sc.player.genero === 'DAMA'
      ? (torneo!.teeDama ?? torneo!.teeHombre)
      : (torneo!.teeHombre ?? torneo!.teeDama)
    const slope  = tee?.slope  ?? 113
    const rating = tee?.rating ?? 72
    const chcp = Math.round(sc.player.hcpIndex * slope / 113 + (rating - parTotal))
    return { gross, neto: gross - chcp, complete: sc._count.entries === totalHoyos }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/torneos" className="hover:text-green-700">Torneos</Link>
        <span>/</span>
        <Link href={`/torneos/${torneo.id}`} className="hover:text-green-700 truncate max-w-[200px]">
          {torneo.nombre}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Tarjetas</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarjetas de scores</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {torneo.nombre} · {totalHoyos} hoyos
          </p>
        </div>
        <Link
          href={`/torneos/${torneo.id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Volver al torneo
        </Link>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm text-gray-600">
        <span>{torneo.scorecards.length} tarjetas cargadas</span>
        <span>·</span>
        <span>{torneo.scorecards.filter(s => s._count.entries === totalHoyos).length} completas</span>
        <span>·</span>
        <span>{jugadores.length} inscriptos</span>
      </div>

      {/* Tabla de jugadores + estado de tarjetas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-sm text-gray-700">Jugadores inscriptos</h2>
          {canEdit && (
            <NuevaTarjetaButton torneoId={torneo.id} />
          )}
        </div>

        {jugadores.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400">
            <p className="text-2xl mb-1">👤</p>
            <p className="text-sm">No hay jugadores inscriptos en la planilla de reservas.</p>
            <Link href={`/torneos/${torneo.id}/reservas`} className="mt-2 inline-block text-xs text-green-600 hover:underline">
              Ir a la planilla de reservas
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden sm:table-cell">Mat.</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Jugador</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Gross</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Neto</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jugadores.map((j) => {
                const tarjeta = tarjetaByPlayer.get(j.id)
                const scores = tarjeta ? calcScores(tarjeta) : null
                return (
                  <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">
                      {j.matricula ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-900">
                        {j.apellido}, {j.nombre}
                      </span>
                      <div className="text-xs text-gray-400">
                        HCP {j.hcpIndex.toFixed(1)} · {j.genero === 'DAMA' ? 'Dama' : 'Cab.'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {scores ? (
                        <span className={`font-semibold ${scores.complete ? 'text-gray-900' : 'text-gray-400'}`}>
                          {scores.gross}
                          {!scores.complete && <span className="text-xs font-normal ml-1">({tarjeta!._count.entries}/{totalHoyos})</span>}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {scores?.complete ? (
                        <span className="font-semibold text-green-700">{scores.neto}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        {tarjeta ? (
                          <>
                            <Link
                              href={`/torneos/${torneo.id}/tarjetas/${tarjeta.id}`}
                              className="text-xs text-green-600 hover:text-green-800 font-medium"
                            >
                              {canEdit ? 'Editar' : 'Ver'} →
                            </Link>
                            {canEdit && (
                              <DeleteScorecardButton
                                torneoId={torneo.id}
                                scorecardId={tarjeta.id}
                                playerName={`${j.apellido}, ${j.nombre}`}
                              />
                            )}
                          </>
                        ) : canEdit ? (
                          <Link
                            href={`/torneos/${torneo.id}/tarjetas/nueva?playerId=${j.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Cargar →
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Tarjetas de jugadores no en planilla (walk-ins) */}
      {torneo.scorecards.filter(sc => !jugadoresMap.has(sc.playerId)).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-sm text-gray-700">Tarjetas adicionales</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden sm:table-cell">Mat.</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Jugador</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Gross</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Neto</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {torneo.scorecards
                .filter(sc => !jugadoresMap.has(sc.playerId))
                .map((sc) => {
                  const scores = calcScores(sc)
                  return (
                    <tr key={sc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">
                        {sc.player.matricula ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-gray-900">
                          {sc.player.apellido}, {sc.player.nombre}
                        </span>
                        <div className="text-xs text-gray-400">
                          HCP {sc.player.hcpIndex.toFixed(1)} · {sc.player.genero === 'DAMA' ? 'Dama' : 'Cab.'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`font-semibold ${scores.complete ? 'text-gray-900' : 'text-gray-400'}`}>
                          {scores.gross}
                          {!scores.complete && <span className="text-xs font-normal ml-1">({sc._count.entries}/{totalHoyos})</span>}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {scores.complete ? (
                          <span className="font-semibold text-green-700">{scores.neto}</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/torneos/${torneo.id}/tarjetas/${sc.id}`}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            {canEdit ? 'Editar' : 'Ver'} →
                          </Link>
                          {canEdit && (
                            <DeleteScorecardButton
                              torneoId={torneo.id}
                              scorecardId={sc.id}
                              playerName={`${sc.player.apellido}, ${sc.player.nombre}`}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
