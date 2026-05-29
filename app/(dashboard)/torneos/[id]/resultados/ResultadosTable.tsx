'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type HoleData = {
  id:            number
  numero:        number
  par:           number
  handicapIndex: number
}

type HoleScore = { numero: number; golpes: number }

type PlayerResult = {
  playerId:    number
  nombre:      string
  apellido:    string
  hcpIndex:    number
  chcp:        number
  ida:         number | null
  vuelta:      number | null
  gross:       number | null
  neto:        number | null
  stableford:  number | null
  holesPlayed: number
  holeScores:  HoleScore[]
}

type RenderItem =
  | { kind: 'regular'; key: string; genero: string; catNombre: string; hcpDesde: number; hcpHasta: number; group: PlayerResult[] }
  | { kind: 'scratch'; genero: string; catNombre: string; players: PlayerResult[] }

type Props = {
  renderItems:  RenderItem[]
  holes:        HoleData[]
  isEighteen:   boolean
  isStableford: boolean
  totalHoles:   number
  torneoId:     number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function strokesOnHole(chcp: number, si: number, totalHoles: number): number {
  const full = Math.floor(chcp / totalHoles)
  const rem  = chcp % totalHoles
  return full + (si <= rem ? 1 : 0)
}

// ── ScoreGrid: tabla de IDA o VUELTA ─────────────────────────────────────────
// Defined at module level (outside ResultadosTable) to avoid remount on re-render.

function ScoreGrid({
  hList, label, parSum, scoreMap, chcp, totalHoles,
}: {
  hList:      HoleData[]
  label:      string
  parSum:     number
  scoreMap:   Map<number, number>
  chcp:       number
  totalHoles: number
}) {
  function getScore(numero: number) { return scoreMap.get(numero) ?? null }

  function cellCls(h: HoleData) {
    const g = getScore(h.numero)
    if (g === null) return 'bg-white'
    const diff = g - h.par
    if (diff <= -2) return 'bg-yellow-100'
    if (diff === -1) return 'bg-green-100'
    if (diff === 0)  return 'bg-white'
    if (diff === 1)  return 'bg-red-50'
    return 'bg-red-100'
  }

  const scoreSum = hList.reduce((a, h) => {
    const g = getScore(h.numero); return g !== null ? a + g : a
  }, 0)
  const defined = hList.filter((h) => getScore(h.numero) !== null).length

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse min-w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-2 py-1 text-left text-gray-500 w-14 font-semibold">{label}</th>
            {hList.map((h) => (
              <th key={h.id} className="px-1 py-1 text-center text-gray-700 min-w-[2rem] font-semibold">
                {h.numero}
              </th>
            ))}
            <th className="px-2 py-1 text-center font-bold text-gray-700">
              {label === 'IDA' ? 'OUT' : 'IN'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {/* Par */}
          <tr className="bg-gray-50">
            <td className="px-2 py-1 text-gray-500">Par</td>
            {hList.map((h) => (
              <td key={h.id} className="px-1 py-1 text-center text-gray-600">{h.par}</td>
            ))}
            <td className="px-2 py-1 text-center font-bold text-gray-700">{parSum}</td>
          </tr>
          {/* Strokes */}
          <tr>
            <td className="px-2 py-1 text-blue-500">Str</td>
            {hList.map((h) => {
              const s = strokesOnHole(chcp, h.handicapIndex, totalHoles)
              return (
                <td key={h.id} className="px-1 py-1 text-center text-blue-500">
                  {s > 0 ? s : ''}
                </td>
              )
            })}
            <td className="px-2 py-1 text-center text-blue-500 font-medium">
              {hList.reduce((a, h) => a + strokesOnHole(chcp, h.handicapIndex, totalHoles), 0)}
            </td>
          </tr>
          {/* Score */}
          <tr>
            <td className="px-2 py-1 font-medium text-gray-700">Golpes</td>
            {hList.map((h) => {
              const g = getScore(h.numero)
              return (
                <td key={h.id} className={`px-1 py-1 text-center font-semibold ${cellCls(h)}`}>
                  {g ?? <span className="text-gray-300">—</span>}
                </td>
              )
            })}
            <td className="px-2 py-1 text-center font-bold text-gray-900">
              {defined > 0 ? scoreSum : '—'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── MiniScorecard ─────────────────────────────────────────────────────────────

function MiniScorecard({
  player, holes, totalHoles, isEighteen, isStableford,
}: {
  player:       PlayerResult
  holes:        HoleData[]
  totalHoles:   number
  isEighteen:   boolean
  isStableford: boolean
}) {
  const holeOut  = holes.filter((h) => h.numero <= 9)
  const holeIn   = isEighteen ? holes.filter((h) => h.numero >= 10) : []
  const scoreMap = new Map(player.holeScores.map((h) => [h.numero, h.golpes]))
  const outPar   = holeOut.reduce((a, h) => a + h.par, 0)
  const inPar    = holeIn.reduce((a, h) => a + h.par, 0)

  return (
    <div className="bg-gray-50 border-t border-blue-100 px-4 py-3 space-y-2">
      <ScoreGrid
        hList={holeOut} label="IDA" parSum={outPar}
        scoreMap={scoreMap} chcp={player.chcp} totalHoles={totalHoles}
      />
      {isEighteen && holeIn.length > 0 && (
        <ScoreGrid
          hList={holeIn} label="VUELTA" parSum={inPar}
          scoreMap={scoreMap} chcp={player.chcp} totalHoles={totalHoles}
        />
      )}

      {/* Leyenda colores */}
      <div className="flex gap-3 flex-wrap text-xs text-gray-400 pt-1">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-200 inline-block" /> Eagle+</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-200 inline-block" /> Birdie</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-white border border-gray-200 inline-block" /> Par</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-50 border border-red-200 inline-block" /> Bogey</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200 inline-block" /> Doble+</span>
      </div>

      {/* Totales resumen */}
      <div className="flex items-center gap-5 text-xs pt-0.5 border-t border-gray-200">
        {player.ida !== null && isEighteen && (
          <span className="text-gray-500">IDA <strong className="text-gray-800">{player.ida}</strong></span>
        )}
        {player.vuelta !== null && isEighteen && (
          <span className="text-gray-500">VTA <strong className="text-gray-800">{player.vuelta}</strong></span>
        )}
        <span className="text-gray-500">Gross <strong className="text-gray-900">{player.gross ?? '—'}</strong></span>
        <span className="text-gray-500">HDC <strong className="text-blue-600">{player.chcp}</strong></span>
        {!isStableford && player.neto !== null && (
          <span className="text-gray-500">Neto <strong className="text-green-700 text-sm">{player.neto}</strong></span>
        )}
        {isStableford && player.stableford !== null && (
          <span className="text-gray-500">Stableford <strong className="text-green-700 text-sm">{player.stableford} pts</strong></span>
        )}
      </div>
    </div>
  )
}

// ── Helpers de render ─────────────────────────────────────────────────────────

function puestoBadge(puesto: number) {
  const cls =
    puesto === 1 ? 'bg-yellow-400 text-yellow-900' :
    puesto === 2 ? 'bg-gray-300 text-gray-700' :
    puesto === 3 ? 'bg-amber-600 text-white' : 'text-gray-400'
  return (
    <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${cls}`}>
      {puesto}
    </span>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ResultadosTable({
  renderItems, holes, isEighteen, isStableford, totalHoles, torneoId,
}: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function toggle(playerId: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(playerId) ? next.delete(playerId) : next.add(playerId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {renderItems.map((item) => {
        const isDama    = item.genero === 'DAMA'
        const genLabel  = isDama ? 'Damas' : 'Caballeros'
        const headerCls = isDama ? 'bg-pink-50' : 'bg-blue-50'
        const titleCls  = isDama ? 'text-pink-800' : 'text-blue-800'
        const subCls    = isDama ? 'text-pink-600' : 'text-blue-600'

        const players = item.kind === 'scratch' ? item.players : item.group

        // ── SCRATCH ──────────────────────────────────────────────────────────
        if (item.kind === 'scratch') {
          return (
            <div key={`scratch-${item.genero}`} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className={`px-5 py-3 border-b border-gray-100 flex items-center gap-2 ${headerCls}`}>
                <h2 className={`font-semibold ${titleCls}`}>{genLabel}</h2>
                <span className={`text-sm font-medium ${subCls}`}>— {item.catNombre}</span>
                <span className="text-xs text-gray-400 ml-1">(gross)</span>
                <span className="ml-auto text-xs text-gray-400">{players.length} jugadores</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-500 w-8">#</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Jugador</th>
                      {isEighteen && (
                        <>
                          <th className="text-center px-3 py-2.5 font-semibold text-gray-500">IDA</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-gray-500">VTA</th>
                        </>
                      )}
                      <th className="text-center px-3 py-2.5 font-semibold text-green-700">Gross</th>
                      <th className="w-6 px-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((r, idx) => {
                      const isExp = expanded.has(r.playerId) && r.gross !== null
                      return (
                        <Fragment key={r.playerId}>
                          <tr
                            onClick={() => r.gross !== null && toggle(r.playerId)}
                            className={`border-b border-gray-50 transition-colors
                              ${r.gross !== null ? 'cursor-pointer hover:bg-blue-50/40' : ''}
                              ${r.holesPlayed < totalHoles ? 'opacity-60' : ''}
                              ${isExp ? 'bg-blue-50/30' : ''}`}
                          >
                            <td className="px-3 py-2.5 text-center">{puestoBadge(idx + 1)}</td>
                            <td className="px-4 py-2.5">
                              <span className="font-medium text-gray-900">{r.apellido}, {r.nombre}</span>
                              {r.holesPlayed < totalHoles && r.holesPlayed > 0 && (
                                <span className="ml-1.5 text-xs text-orange-500">({r.holesPlayed}h)</span>
                              )}
                            </td>
                            {isEighteen && (
                              <>
                                <td className="px-3 py-2.5 text-center text-gray-600">{r.ida ?? '—'}</td>
                                <td className="px-3 py-2.5 text-center text-gray-600">{r.vuelta ?? '—'}</td>
                              </>
                            )}
                            <td className="px-3 py-2.5 text-center font-bold text-green-700">{r.gross ?? '—'}</td>
                            <td className="px-2 py-2.5 text-center text-gray-300 text-xs select-none">
                              {r.gross !== null && (isExp ? '▲' : '▼')}
                            </td>
                          </tr>
                          {isExp && (
                            <tr>
                              <td colSpan={99} className="p-0">
                                <MiniScorecard
                                  player={r} holes={holes}
                                  totalHoles={totalHoles} isEighteen={isEighteen}
                                  isStableford={isStableford}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        // ── REGULAR ──────────────────────────────────────────────────────────
        const { key, group, catNombre } = item
        return (
          <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`px-5 py-3 border-b border-gray-100 flex items-center gap-2 ${headerCls}`}>
              <h2 className={`font-semibold ${titleCls}`}>{genLabel}</h2>
              {catNombre !== 'Sin categoría' && catNombre !== 'Única' && (
                <span className={`text-sm ${subCls}`}>— Categoría {catNombre}</span>
              )}
              <span className="ml-auto text-xs text-gray-400">{group.length} jugadores</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-center px-3 py-2.5 font-semibold text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Jugador</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-gray-500">HDC</th>
                    {isEighteen && (
                      <>
                        <th className="text-center px-3 py-2.5 font-semibold text-gray-500">IDA</th>
                        <th className="text-center px-3 py-2.5 font-semibold text-gray-500">VTA</th>
                      </>
                    )}
                    <th className="text-center px-3 py-2.5 font-semibold text-gray-600">Gross</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-green-700">
                      {isStableford ? 'Pts' : 'Neto'}
                    </th>
                    <th className="w-6 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {group.map((r, idx) => {
                    const isExp = expanded.has(r.playerId) && r.gross !== null
                    return (
                      <Fragment key={r.playerId}>
                        <tr
                          onClick={() => r.gross !== null && toggle(r.playerId)}
                          className={`border-b border-gray-50 transition-colors
                            ${r.gross !== null ? 'cursor-pointer hover:bg-blue-50/40' : ''}
                            ${r.holesPlayed < totalHoles ? 'opacity-60' : ''}
                            ${isExp ? 'bg-blue-50/30' : ''}`}
                        >
                          <td className="px-3 py-2.5 text-center">
                            {r.gross !== null
                              ? puestoBadge(idx + 1)
                              : <span className="text-gray-200 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-gray-900">{r.apellido}, {r.nombre}</span>
                            {r.holesPlayed < totalHoles && r.holesPlayed > 0 && (
                              <span className="ml-1.5 text-xs text-orange-500">({r.holesPlayed}h)</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center text-blue-600 font-medium text-xs">{r.chcp}</td>
                          {isEighteen && (
                            <>
                              <td className="px-3 py-2.5 text-center text-gray-600">{r.ida ?? '—'}</td>
                              <td className="px-3 py-2.5 text-center text-gray-600">{r.vuelta ?? '—'}</td>
                            </>
                          )}
                          <td className="px-3 py-2.5 text-center font-medium text-gray-800">{r.gross ?? '—'}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-green-700">
                            {isStableford ? (r.stableford ?? '—') : (r.neto ?? '—')}
                          </td>
                          <td className="px-2 py-2.5 text-center text-gray-300 text-xs select-none">
                            {r.gross !== null && (isExp ? '▲' : '▼')}
                          </td>
                        </tr>
                        {isExp && (
                          <tr>
                            <td colSpan={99} className="p-0">
                              <MiniScorecard
                                player={r} holes={holes}
                                totalHoles={totalHoles} isEighteen={isEighteen}
                                isStableford={isStableford}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
