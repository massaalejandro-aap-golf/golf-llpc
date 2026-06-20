'use client'

import { useState } from 'react'
import type { LeaderboardGroup, LeaderboardPlayer, LeaderboardResponse } from '@/lib/leaderboard'

// ── Tarjeta expandida ─────────────────────────────────────────────────────────

function Tarjeta({
  player,
  holes,
  kind,
  isEighteen,
}: {
  player: LeaderboardPlayer
  holes: LeaderboardResponse['torneo']['holes']
  kind: 'regular' | 'scratch'
  isEighteen: boolean
}) {
  const scoreMap = new Map(player.holeScores.map((h) => [h.numero, h]))
  const parTotal = holes.reduce((s, h) => s + h.par, 0)

  const front = holes.filter((h) => h.numero <= 9)
  const back  = isEighteen ? holes.filter((h) => h.numero > 9) : []

  const frontGross = front.reduce((s, h) => s + (scoreMap.get(h.numero)?.golpes ?? 0), 0)
  const backGross  = isEighteen ? back.reduce((s, h) => s + (scoreMap.get(h.numero)?.golpes ?? 0), 0) : 0

  function cellColor(golpes: number, par: number, chcp: number, si: number) {
    const strokes = Math.floor(chcp / holes.length) + (si <= chcp % holes.length ? 1 : 0)
    const neto = golpes - par - strokes
    if (neto <= -2) return 'bg-yellow-300 text-yellow-900 font-bold'
    if (neto === -1) return 'bg-red-500 text-white font-bold'
    if (neto === 0)  return 'bg-white text-gray-900'
    if (neto === 1)  return 'bg-blue-100 text-blue-900'
    return 'bg-blue-200 text-blue-900 font-bold'
  }

  const HoleRow = ({ holeList }: { holeList: typeof holes }) => (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-gray-100 text-gray-500">
          <th className="text-left px-2 py-1 font-medium w-6">H</th>
          <th className="text-center px-1 py-1 font-medium">Par</th>
          <th className="text-center px-1 py-1 font-medium">SI</th>
          <th className="text-center px-2 py-1 font-medium">Golpes</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {holeList.map((h) => {
          const hs = scoreMap.get(h.numero)
          return (
            <tr key={h.numero}>
              <td className="px-2 py-1.5 font-semibold text-gray-600">{h.numero}</td>
              <td className="text-center px-1 py-1.5 text-gray-500">{h.par}</td>
              <td className="text-center px-1 py-1.5 text-gray-400">{h.si}</td>
              <td className="text-center px-2 py-1.5">
                {hs ? (
                  <span className={`inline-block w-7 h-7 leading-7 rounded-full text-center text-sm ${kind === 'regular'
                    ? cellColor(hs.golpes, h.par, player.chcp, h.si)
                    : hs.golpes < h.par ? 'bg-red-500 text-white font-bold' : hs.golpes === h.par ? 'bg-white text-gray-900' : 'bg-blue-100 text-blue-900'
                  }`}>
                    {hs.golpes}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>
          )
        })}
        {/* Subtotal */}
        <tr className="bg-gray-50 font-semibold">
          <td colSpan={3} className="px-2 py-1.5 text-gray-600 text-xs">Subtotal</td>
          <td className="text-center px-2 py-1.5 text-gray-800">
            {holeList === front ? frontGross || '—' : backGross || '—'}
          </td>
        </tr>
      </tbody>
    </table>
  )

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-3">
      <div className="flex gap-4 text-xs text-gray-500 mb-1">
        <span>Par total: <strong className="text-gray-700">{parTotal}</strong></span>
        {kind === 'regular' && <span>HCP juego: <strong className="text-gray-700">{player.chcp}</strong></span>}
        {player.gross !== null && <span>Gross: <strong className="text-gray-700">{player.gross}</strong></span>}
        {kind === 'regular' && player.neto !== null && <span>Neto: <strong className="text-green-700">{player.neto}</strong></span>}
      </div>

      {isEighteen ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">IDA (1–9)</p>
            <HoleRow holeList={front} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">VUELTA (10–18)</p>
            <HoleRow holeList={back} />
          </div>
        </div>
      ) : (
        <HoleRow holeList={front} />
      )}
    </div>
  )
}

// ── Fila de jugador ───────────────────────────────────────────────────────────

function PlayerRow({
  player,
  pos,
  kind,
  isEighteen,
  isStableford,
  holes,
}: {
  player: LeaderboardPlayer
  pos: number
  kind: 'regular' | 'scratch'
  isEighteen: boolean
  isStableford: boolean
  holes: LeaderboardResponse['torneo']['holes']
}) {
  const [open, setOpen] = useState(false)
  const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null
  const hasScores = player.holeScores.length > 0

  return (
    <div>
      <button
        onClick={() => hasScores && setOpen((v) => !v)}
        className={`w-full text-left ${hasScores ? 'active:bg-gray-50' : ''}`}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Pos */}
          <div className="w-7 text-center shrink-0">
            {medal
              ? <span className="text-base">{medal}</span>
              : <span className="text-xs font-bold text-gray-400">{pos}</span>
            }
          </div>

          {/* Nombre */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {player.apellido}, {player.nombre}
              {hasScores && <span className="ml-1 text-gray-300 text-xs">{open ? '▲' : '▼'}</span>}
            </p>
            {kind === 'regular' && (
              <p className="text-xs text-gray-400">HCP {player.hcpIndex.toFixed(1)} → <span className="text-gray-600 font-medium">{player.chcp}</span></p>
            )}
          </div>

          {/* Scores */}
          {isStableford ? (
            <div className="shrink-0 text-right">
              <span className="text-base font-bold text-green-700">{player.stableford ?? '—'}</span>
              <span className="text-xs text-gray-400 ml-0.5">pts</span>
            </div>
          ) : (
            <div className="shrink-0 text-right text-xs text-gray-500 space-y-0.5">
              {isEighteen ? (
                <>
                  <div className="flex gap-2 justify-end">
                    <span>Ida <span className="font-semibold text-gray-700">{player.ida ?? '—'}</span></span>
                    <span>Vta <span className="font-semibold text-gray-700">{player.vuelta ?? '—'}</span></span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <span>Total <span className="font-bold text-gray-900">{player.gross ?? '—'}</span></span>
                    {kind === 'regular' && (
                      <span>Neto <span className="font-bold text-green-700">{player.neto ?? '—'}</span></span>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex gap-2 justify-end">
                  <span>Total <span className="font-bold text-gray-900">{player.gross ?? '—'}</span></span>
                  {kind === 'regular' && (
                    <span>Neto <span className="font-bold text-green-700">{player.neto ?? '—'}</span></span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </button>

      {open && hasScores && (
        <Tarjeta player={player} holes={holes} kind={kind} isEighteen={isEighteen} />
      )}
    </div>
  )
}

// ── Grupo de categoría ────────────────────────────────────────────────────────

function GroupSection({
  group,
  isEighteen,
  isStableford,
  holes,
}: {
  group: LeaderboardGroup
  isEighteen: boolean
  isStableford: boolean
  holes: LeaderboardResponse['torneo']['holes']
}) {
  const isDama = group.genero === 'DAMA'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header categoría */}
      <div className={`px-4 py-2.5 text-sm font-semibold flex items-center justify-between ${isDama ? 'bg-pink-50 text-pink-800' : 'bg-blue-50 text-blue-800'}`}>
        <span>{isDama ? 'Damas' : 'Caballeros'} — {group.catNombre}</span>
        {group.kind === 'scratch' && <span className="text-xs font-normal opacity-60">gross</span>}
      </div>

      {/* Header columnas */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-medium">
        <div className="w-7 text-center">Pos</div>
        <div className="flex-1">Jugador {group.kind === 'regular' && '/ HCP'}</div>
        {isEighteen
          ? <div className="text-right shrink-0 w-36">Ida · Vta · Total{group.kind === 'regular' ? ' · Neto' : ''}</div>
          : <div className="text-right shrink-0 w-24">Total{group.kind === 'regular' ? ' · Neto' : ''}</div>
        }
      </div>

      <div className="divide-y divide-gray-50">
        {group.players.map((p, i) => (
          <PlayerRow
            key={p.playerId}
            player={p}
            pos={i + 1}
            kind={group.kind}
            isEighteen={isEighteen}
            isStableford={isStableford}
            holes={holes}
          />
        ))}
      </div>
    </div>
  )
}

// ── Componente raíz ───────────────────────────────────────────────────────────

export default function LeaderboardClient({ lb }: { lb: LeaderboardResponse }) {
  const { torneo, groups, isEighteen, isStableford } = lb

  if (groups.length === 0) {
    return (
      <div className="text-center text-gray-500 py-16 px-6">
        <p className="text-4xl mb-3">📋</p>
        <p className="font-medium">Sin resultados cargados todavía.</p>
      </div>
    )
  }

  return (
    <div className="px-3 py-4 space-y-4">
      {groups.map((group, gi) => (
        <GroupSection
          key={gi}
          group={group}
          isEighteen={isEighteen}
          isStableford={isStableford}
          holes={torneo.holes}
        />
      ))}
    </div>
  )
}
