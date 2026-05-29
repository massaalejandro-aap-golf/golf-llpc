import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import ScorecardForm from './ScorecardForm'

export default async function ScorecardPage(
  props: { params: Promise<{ id: string; scorecardId: string }> }
) {
  const { id, scorecardId } = await props.params
  const session = await requireSession()
  const canEdit = session.role === 'ADMIN' || session.role === 'COMISION'

  // Tarjeta con jugador y entradas
  const scorecard = await prisma.scorecard.findUnique({
    where: { id: Number(scorecardId) },
    include: {
      player: true,
      entries: {
        include: { hole: true },
        orderBy: { hole: { numero: 'asc' } },
      },
    },
  })

  if (!scorecard || scorecard.tournamentId !== Number(id)) notFound()

  // Torneo + cancha + hoyos + tees
  const torneo = await prisma.tournament.findUnique({
    where: { id: Number(id) },
    include: {
      course: {
        include: {
          holes: { orderBy: { numero: 'asc' } },
        },
      },
      teeHombre: { select: { slope: true, rating: true } },
      teeDama:   { select: { slope: true, rating: true } },
    },
  })

  if (!torneo) notFound()

  const isEighteen = torneo.hoyos === 'EIGHTEEN'
  const holes = isEighteen
    ? torneo.course.holes
    : torneo.course.holes.filter((h) => h.numero <= 9)

  const parTotal  = holes.reduce((a, h) => a + h.par, 0)
  const esDama = scorecard.player.genero === 'DAMA'
  const tee = esDama
    ? (torneo.teeDama ?? torneo.teeHombre)
    : (torneo.teeHombre ?? torneo.teeDama)
  const slopeAzul  = tee?.slope  ?? 113
  const ratingAzul = tee?.rating ?? 72

  // Mapa de scores guardados: holeId → golpes
  const initialScores: Record<number, number> = {}
  for (const entry of scorecard.entries) {
    initialScores[entry.holeId] = entry.golpes
  }

  const playerName = `${scorecard.player.apellido}, ${scorecard.player.nombre}`

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/torneos" className="hover:text-green-700">Torneos</Link>
        <span>/</span>
        <Link href={`/torneos/${torneo.id}`} className="hover:text-green-700 max-w-[150px] truncate">
          {torneo.nombre}
        </Link>
        <span>/</span>
        <Link href={`/torneos/${torneo.id}/tarjetas`} className="hover:text-green-700">Tarjetas</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">{playerName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarjeta de score</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {torneo.nombre} · {new Date(torneo.fecha).toLocaleDateString('es-AR', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}
          </p>
        </div>
        <Link
          href={`/torneos/${torneo.id}/tarjetas`}
          className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          ← Tarjetas
        </Link>
      </div>

      {/* Estado AAG */}
      {scorecard.aagSubmitted && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-800">
          ✓ Tarjeta enviada a la AAG
          {scorecard.aagSubmittedAt && (
            <span className="text-green-600 ml-2 text-xs">
              ({new Date(scorecard.aagSubmittedAt).toLocaleString('es-AR')})
            </span>
          )}
        </div>
      )}

      {/* Formulario interactivo */}
      <ScorecardForm
        scorecardId={scorecard.id}
        torneoId={torneo.id}
        playerName={playerName}
        hcpIndex={scorecard.player.hcpIndex}
        slopeAzul={slopeAzul}
        ratingAzul={ratingAzul}
        par={parTotal}
        holes={holes.map((h) => ({
          id:            h.id,
          numero:        h.numero,
          par:           h.par,
          handicapIndex: h.handicapIndex,
        }))}
        initialScores={initialScores}
        canEdit={canEdit}
        isEighteen={isEighteen}
      />
    </div>
  )
}
