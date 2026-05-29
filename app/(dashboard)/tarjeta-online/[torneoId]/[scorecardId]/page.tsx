import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import TarjetaOnlineForm from './TarjetaOnlineForm'

export default async function TarjetaOnlinePage(props: {
  params: Promise<{ torneoId: string; scorecardId: string }>
}) {
  const { torneoId, scorecardId } = await props.params
  const session = await requireSession()

  const sc = await prisma.scorecard.findUnique({
    where: { id: Number(scorecardId) },
    include: {
      player:   { select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true, matricula: true } },
      marcador: { select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true, matricula: true } },
      entries:  { select: { holeId: true, golpes: true } },
      tournament: {
        select: {
          id: true, nombre: true, tipo: true, hoyos: true,
          teeHombreId: true, teeDamaId: true,
          teeHombre: { select: { id: true, nombre: true, slope: true, rating: true } },
          teeDama:   { select: { id: true, nombre: true, slope: true, rating: true } },
          course: {
            select: {
              holes: {
                orderBy: { numero: 'asc' },
                select: { id: true, numero: true, par: true, parDamas: true, handicapIndex: true, handicapIndexDamas: true },
              },
            },
          },
        },
      },
    },
  })

  if (!sc || sc.tournamentId !== Number(torneoId)) notFound()

  const isStaff = session.role === 'ADMIN' || session.role === 'COMISION'
  if (!isStaff && sc.marcadorPlayerId !== session.playerId && sc.playerId !== session.playerId) {
    redirect('/tarjeta-online')
  }

  // Scorecard propia del marcador (YO) si existe
  const scYo = sc.marcadorPlayerId && sc.marcadorPlayerId !== sc.playerId
    ? await prisma.scorecard.findUnique({
        where: { tournamentId_playerId_ronda: { tournamentId: Number(torneoId), playerId: sc.marcadorPlayerId, ronda: 1 } },
        include: { entries: { select: { holeId: true, golpes: true } } },
      })
    : null

  const torneo = sc.tournament
  const holes = torneo.course.holes
  const isEighteen = torneo.hoyos === 'EIGHTEEN'

  // Tee según género
  const teeJug = sc.player.genero === 'DAMA' ? torneo.teeDama : torneo.teeHombre
  const teeYo  = sc.marcador?.genero === 'DAMA' ? torneo.teeDama : torneo.teeHombre
  const parTotal = holes.reduce((s, h) =>
    s + (sc.player.genero === 'DAMA' ? (h.parDamas ?? h.par) : h.par), 0)

  const scoresJug: Record<number, number> = {}
  for (const e of sc.entries) scoresJug[e.holeId] = e.golpes

  const scoresYo: Record<number, number> = {}
  if (scYo) for (const e of scYo.entries) scoresYo[e.holeId] = e.golpes

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/tarjeta-online" className="hover:text-green-700">Tarjeta Online</Link>
        <span>/</span>
        <span className="truncate text-gray-700">{torneo.nombre}</span>
      </div>

      <TarjetaOnlineForm
        scorecardId={sc.id}
        yoScorecardId={scYo?.id ?? null}
        torneoId={sc.tournamentId}
        jugador={{ id: sc.player.id, nombre: sc.player.nombre, apellido: sc.player.apellido, hcpIndex: sc.player.hcpIndex, genero: sc.player.genero, matricula: sc.player.matricula }}
        marcador={sc.marcador ?? null}
        holes={holes.map((h) => ({
          id: h.id,
          numero: h.numero,
          par: sc.player.genero === 'DAMA' ? (h.parDamas ?? h.par) : h.par,
          parYo: sc.marcador?.genero === 'DAMA' ? (h.parDamas ?? h.par) : h.par,
          siJug: sc.player.genero === 'DAMA' ? (h.handicapIndexDamas ?? h.handicapIndex) : h.handicapIndex,
          siYo:  sc.marcador?.genero === 'DAMA' ? (h.handicapIndexDamas ?? h.handicapIndex) : h.handicapIndex,
        }))}
        teeJug={{ slope: teeJug?.slope ?? 113, rating: teeJug?.rating ?? parTotal, nombre: teeJug?.nombre ?? '' }}
        teeYo={{ slope: teeYo?.slope ?? 113, rating: teeYo?.rating ?? parTotal, nombre: teeYo?.nombre ?? '' }}
        parTotal={parTotal}
        isEighteen={isEighteen}
        initialScoresJug={scoresJug}
        initialScoresYo={scoresYo}
        estado={sc.onlineEstado}
        canEdit={sc.onlineEstado !== 'VALIDADA'}
      />
    </div>
  )
}
