import { requireSession } from '@/lib/session'
import { computeLeaderboard } from '@/lib/leaderboard'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { LeaderboardGroup, LeaderboardPlayer } from '@/lib/leaderboard'

export const dynamic = 'force-dynamic'

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default async function MobileTorneoLeaderboardPage({
  params,
}: {
  params: Promise<{ torneoId: string }>
}) {
  await requireSession()
  const { torneoId } = await params
  const id = parseInt(torneoId)
  if (isNaN(id)) notFound()

  const lb = await computeLeaderboard(id)
  if (!lb) notFound()

  const { torneo, groups, isEighteen, isStableford } = lb

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-green-700 text-white px-6 pt-10 pb-6">
        <p className="text-green-200 text-sm font-medium tracking-wide uppercase">Leaderboard</p>
        <h1 className="text-lg font-bold mt-1 leading-snug">{torneo.nombre}</h1>
        <p className="text-green-200 text-xs mt-1">{fmtFecha(torneo.fecha)} · {torneo.tipo}</p>
      </div>

      <div className="flex-1 px-3 py-4 space-y-4">
        {groups.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">Sin resultados cargados todavía.</p>
          </div>
        ) : (
          groups.map((group, gi) => (
            <GroupSection
              key={gi}
              group={group}
              isEighteen={isEighteen}
              isStableford={isStableford}
            />
          ))
        )}
      </div>

      <div className="p-4">
        <Link
          href="/mobile/leaderboard"
          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-5 py-4 font-semibold active:scale-95 transition-transform"
        >
          ← Volver a torneos
        </Link>
      </div>
    </div>
  )
}

function GroupSection({ group, isEighteen, isStableford }: {
  group: LeaderboardGroup
  isEighteen: boolean
  isStableford: boolean
}) {
  const isDama = group.genero === 'DAMA'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`px-4 py-3 text-sm font-semibold ${isDama ? 'bg-pink-50 text-pink-800' : 'bg-blue-50 text-blue-800'}`}>
        {isDama ? 'Damas' : 'Caballeros'} — {group.catNombre}
        {group.kind === 'scratch' && <span className="ml-1 text-xs font-normal opacity-70">(gross)</span>}
      </div>
      <div className="divide-y divide-gray-50">
        {group.players.map((p, i) => (
          <PlayerRow key={p.playerId} player={p} pos={i + 1} isEighteen={isEighteen} isStableford={isStableford} kind={group.kind} />
        ))}
      </div>
    </div>
  )
}

function PlayerRow({ player, pos, isEighteen, isStableford, kind }: {
  player: LeaderboardPlayer
  pos: number
  isEighteen: boolean
  isStableford: boolean
  kind: 'regular' | 'scratch'
}) {
  const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null
  const incomplete = player.gross !== null && player.holesPlayed < player.totalHoles

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 text-center shrink-0">
        {medal ? (
          <span className="text-lg">{medal}</span>
        ) : (
          <span className="text-sm font-bold text-gray-400">{pos}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">
          {player.apellido}, {player.nombre}
          {incomplete && <span className="ml-1 text-xs text-orange-500">({player.holesPlayed}H)</span>}
        </p>
        {kind === 'regular' && (
          <p className="text-xs text-gray-400">HCP {player.hcpIndex.toFixed(1)} → {player.chcp}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {isStableford ? (
          <p className="text-lg font-bold text-green-700">{player.stableford ?? '—'} pts</p>
        ) : (
          <div>
            {kind === 'regular' && player.neto !== null && (
              <p className="text-base font-bold text-green-700">{player.neto}</p>
            )}
            {player.gross !== null && (
              <p className={`text-xs ${kind === 'regular' ? 'text-gray-400' : 'text-base font-bold text-green-700'}`}>
                {kind === 'scratch' ? player.gross : `G: ${player.gross}`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
