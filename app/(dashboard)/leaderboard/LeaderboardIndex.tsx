'use client'

import { useState } from 'react'
import type { LeaderboardResponse, LeaderboardGroup, LeaderboardPlayer } from '@/lib/leaderboard'

// ── Tipos ──────────────────────────────────────────────────────────────────────

type TorneoItem = {
  id:       number
  nombre:   string
  fecha:    string
  tipo:     string
  hoyos:    string
  _count:   { scorecards: number }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  MEDAL:               'Medal',
  STABLEFORD:          'Stableford',
  MATCH_PLAY:          'Match Play',
  CHOICE_ECLECTIC:     'Choice / Eclectic',
  RANKING:             'Ranking',
  GOLFER:              'Golfer',
  FOURBALL_AMERICANO:  'Fourball Americano',
  FOURBALL_CLASICO:    'Fourball Clásico',
  FOURBALL_AGGREGATE:  'Fourball Aggregate',
  LAGUNEADA:           'Laguneada',
  FOURSOME:            'Foursome',
  SCRAMBLE:            'Scramble',
  PELOTERO:            'Pelotero',
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Sub-componente: tabla de un grupo ─────────────────────────────────────────

function GroupTable({
  group,
  isEighteen,
  isStableford,
}: {
  group:       LeaderboardGroup
  isEighteen:  boolean
  isStableford:boolean
}) {
  const isDama   = group.genero === 'DAMA'
  const genLabel = isDama ? 'Damas' : 'Caballeros'
  const players: LeaderboardPlayer[] = group.kind === 'scratch' ? group.players : group.players

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      {/* Header de categoría */}
      <div className={`px-4 py-2 flex items-center gap-2 text-sm ${isDama ? 'bg-pink-50' : 'bg-blue-50'}`}>
        <span className={`font-semibold ${isDama ? 'text-pink-800' : 'text-blue-800'}`}>{genLabel}</span>
        <span className={`${isDama ? 'text-pink-600' : 'text-blue-600'}`}>— {group.catNombre}</span>
        {group.kind === 'scratch' && (
          <span className="text-xs text-gray-400">(gross)</span>
        )}
        <span className="ml-auto text-xs text-gray-400">{players.length} jugadores</span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs">
              <th className="text-center px-3 py-2 font-semibold text-gray-400 w-8">#</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Jugador</th>
              {group.kind === 'regular' && (
                <th className="text-center px-3 py-2 font-semibold text-gray-400">HDC</th>
              )}
              {isEighteen && (
                <>
                  <th className="text-center px-3 py-2 font-semibold text-gray-400">IDA</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-400">VTA</th>
                </>
              )}
              <th className="text-center px-3 py-2 font-semibold text-gray-600">Gross</th>
              {group.kind === 'regular' && !isStableford && (
                <th className="text-center px-3 py-2 font-semibold text-green-700">Neto</th>
              )}
              {group.kind === 'regular' && isStableford && (
                <th className="text-center px-3 py-2 font-semibold text-green-700">Pts</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {players.map((r, idx) => {
              const puesto = idx + 1
              const incomplete = r.holesPlayed < r.totalHoles
              return (
                <tr key={r.playerId} className={`hover:bg-gray-50 transition-colors ${incomplete ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2 text-center">
                    {r.gross !== null ? (
                      <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${
                        puesto === 1 ? 'bg-yellow-400 text-yellow-900' :
                        puesto === 2 ? 'bg-gray-300 text-gray-700' :
                        puesto === 3 ? 'bg-amber-600 text-white' : 'text-gray-400'
                      }`}>{puesto}</span>
                    ) : <span className="text-gray-200 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium text-gray-900">{r.apellido}, {r.nombre}</span>
                    {incomplete && r.holesPlayed > 0 && (
                      <span className="ml-1.5 text-xs text-orange-500">({r.holesPlayed}h)</span>
                    )}
                  </td>
                  {group.kind === 'regular' && (
                    <td className="px-3 py-2 text-center text-blue-600 font-medium text-xs">{r.chcp}</td>
                  )}
                  {isEighteen && (
                    <>
                      <td className="px-3 py-2 text-center text-gray-600">{r.ida ?? '—'}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{r.vuelta ?? '—'}</td>
                    </>
                  )}
                  <td className="px-3 py-2 text-center font-medium text-gray-800">{r.gross ?? '—'}</td>
                  {group.kind === 'regular' && !isStableford && (
                    <td className="px-3 py-2 text-center font-bold text-green-700">{r.neto ?? '—'}</td>
                  )}
                  {group.kind === 'regular' && isStableford && (
                    <td className="px-3 py-2 text-center font-bold text-green-700">{r.stableford ?? '—'}</td>
                  )}
                </tr>
              )
            })}
            {players.length === 0 && (
              <tr>
                <td colSpan={99} className="px-4 py-4 text-center text-xs text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function LeaderboardIndex({
  torneos,
  initialData,
}: {
  torneos:     TorneoItem[]
  initialData: Record<number, LeaderboardResponse>
}) {
  const [expanded, setExpanded]   = useState<Record<number, boolean>>({})
  const [loading,  setLoading]    = useState<Record<number, boolean>>({})
  const [data,     setData]       = useState<Record<number, LeaderboardResponse>>(initialData)
  const [errors,   setErrors]     = useState<Record<number, string>>({})

  async function toggle(id: number) {
    const isOpen = expanded[id]

    // Cerrar
    if (isOpen) {
      setExpanded((prev) => ({ ...prev, [id]: false }))
      return
    }

    // Abrir — si ya tenemos datos, solo mostrar
    setExpanded((prev) => ({ ...prev, [id]: true }))
    if (data[id]) return

    // Fetch
    setLoading((prev) => ({ ...prev, [id]: true }))
    setErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      const res = await fetch(`/api/torneos/${id}/leaderboard`)
      if (!res.ok) throw new Error('Error al cargar')
      const json: LeaderboardResponse = await res.json()
      setData((prev) => ({ ...prev, [id]: json }))
    } catch {
      setErrors((prev) => ({ ...prev, [id]: 'No se pudo cargar el leaderboard' }))
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  if (torneos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-3xl mb-2">🏆</p>
        <p className="text-sm">No hay torneos registrados aún.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {torneos.map((t) => {
        const isOpen    = !!expanded[t.id]
        const isLoading = !!loading[t.id]
        const lb        = data[t.id]
        const err       = errors[t.id]

        return (
          <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Fila del torneo — clickeable */}
            <button
              onClick={() => toggle(t.id)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              {/* Fecha pill */}
              <div className="flex-shrink-0 text-center hidden sm:block">
                <p className="text-xs text-gray-400 leading-tight">
                  {new Date(t.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-xs font-medium text-gray-500">
                  {new Date(t.fecha).getFullYear()}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{t.nombre}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {TIPO_LABEL[t.tipo] ?? t.tipo}
                  {' · '}
                  {t.hoyos === 'EIGHTEEN' ? '18 hoyos' : '9 hoyos'}
                  {' · '}
                  <span className="sm:hidden">
                    {new Date(t.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                  </span>
                  {t._count.scorecards} tarjetas
                </p>
              </div>

              {/* Estado & chevron */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {t._count.scorecards === 0 && (
                  <span className="text-xs text-gray-300">Sin datos</span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Contenido expandido */}
            {isOpen && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                {isLoading && (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                    <svg className="animate-spin w-5 h-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Cargando resultados…
                  </div>
                )}

                {err && (
                  <p className="text-sm text-red-500 text-center py-4">{err}</p>
                )}

                {lb && lb.groups.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No hay tarjetas cargadas.</p>
                )}

                {lb && lb.groups.length > 0 && (
                  <>
                    <p className="text-xs text-gray-400 text-right">
                      {fmtFecha(lb.torneo.fecha)} · {TIPO_LABEL[lb.torneo.tipo] ?? lb.torneo.tipo}
                      {' · '}{lb.isEighteen ? '18 hoyos' : '9 hoyos'}
                    </p>
                    <div className="space-y-3">
                      {lb.groups.map((group, i) => (
                        <GroupTable
                          key={i}
                          group={group}
                          isEighteen={lb.isEighteen}
                          isStableford={lb.isStableford}
                        />
                      ))}
                    </div>
                    <div className="pt-1 text-right">
                      <a
                        href={`/torneos/${t.id}/resultados`}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Ver resultados completos →
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
