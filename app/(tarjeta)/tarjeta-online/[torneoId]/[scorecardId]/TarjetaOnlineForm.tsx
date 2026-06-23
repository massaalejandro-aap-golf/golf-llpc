'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Hole {
  id: number; numero: number; par: number; parYo: number; siJug: number; siYo: number
}
interface Player {
  id: number; nombre: string; apellido: string; hcpIndex: number; genero: string; matricula: string | null
}
interface Tee { slope: number; rating: number; nombre: string }

interface Props {
  scorecardId:     number
  yoScorecardId:   number | null
  torneoId:        number
  jugador:         Player
  marcador:        Player | null
  holes:           Hole[]
  teeJug:          Tee
  teeYo:           Tee
  parTotal:        number
  isEighteen:      boolean
  initialScoresJug: Record<number, number>
  initialScoresYo:  Record<number, number>
  estado:          string
  canEdit:         boolean
}

function courseHcp(hcpIndex: number, slope: number, rating: number, par: number) {
  return Math.round(hcpIndex * slope / 113 + (rating - par))
}
function strokesOnHole(chp: number, si: number, n: number) {
  return Math.floor(chp / n) + (si <= chp % n ? 1 : 0)
}

function CeldaGolpes({ golpes, par, onChange, onClear, disabled, inconsistente }: {
  golpes: number | undefined
  par: number
  onChange: (v: number) => void
  onClear: () => void
  disabled: boolean
  inconsistente?: boolean
}) {
  const [raw, setRaw] = useState(golpes != null ? String(golpes) : '')
  useEffect(() => { setRaw(golpes != null ? String(golpes) : '') }, [golpes])

  const diff = golpes != null ? golpes - par : null
  const color = inconsistente
    ? 'animate-pulse bg-orange-200 border-orange-400'
    : diff == null ? 'bg-white' :
      diff <= -2 ? 'bg-yellow-200' : diff === -1 ? 'bg-green-200' :
      diff === 0 ? 'bg-white' : diff === 1 ? 'bg-red-100' : 'bg-red-200'

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setRaw(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1 && n <= 20) onChange(n)
  }
  function handleBlur() {
    const n = parseInt(raw)
    if (isNaN(n) || n < 1 || n > 20) setRaw(golpes != null ? String(golpes) : '')
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={raw}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={`w-full text-center font-bold text-lg text-gray-900 border rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400 ${color} ${inconsistente ? '' : 'border-gray-300'}`}
      />
      {golpes != null && !disabled && (
        <button
          type="button"
          onClick={() => { setRaw(''); onClear() }}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-gray-400 hover:bg-gray-600 text-white text-xs leading-none"
          tabIndex={-1}
        >×</button>
      )}
      {inconsistente && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />
      )}
    </div>
  )
}

export default function TarjetaOnlineForm({
  scorecardId, yoScorecardId, torneoId, jugador, marcador, holes,
  teeJug, teeYo, parTotal, isEighteen, initialScoresJug, initialScoresYo,
  estado, canEdit,
}: Props) {
  const router = useRouter()
  const [scoresJug, setScoresJug] = useState<Record<number, number>>(initialScoresJug)
  const [scoresYo,  setScoresYo]  = useState<Record<number, number>>(initialScoresYo)
  const [vista, setVista] = useState<'IDA' | 'VUELTA'>('IDA')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [crossScores, setCrossScores] = useState<Record<number, number>>({})

  useEffect(() => {
    if (estado === 'VALIDADA') return
    async function fetchCross() {
      const res = await fetch(`/api/tarjeta-online/${scorecardId}/cross-check`)
      if (res.ok) { const data = await res.json(); setCrossScores(data.scores ?? {}) }
    }
    fetchCross()
    const interval = setInterval(fetchCross, 15000)
    return () => clearInterval(interval)
  }, [scorecardId, estado])

  const n      = holes.length
  const chpJug = courseHcp(jugador.hcpIndex, teeJug.slope, teeJug.rating, parTotal)
  const chpYo  = marcador ? courseHcp(marcador.hcpIndex, teeYo.slope, teeYo.rating, parTotal) : 0

  const ida      = holes.slice(0, isEighteen ? 9 : n)
  const vuelta   = isEighteen ? holes.slice(9) : []
  const holeList = vista === 'IDA' ? ida : vuelta

  const setJug   = useCallback((holeId: number, v: number) => setScoresJug((p) => ({ ...p, [holeId]: v })), [])
  const clearJug = useCallback((holeId: number) => setScoresJug((p) => { const n = { ...p }; delete n[holeId]; return n }), [])
  const setYo    = useCallback((holeId: number, v: number) => setScoresYo((p) => ({ ...p, [holeId]: v })), [])
  const clearYo  = useCallback((holeId: number) => setScoresYo((p) => { const n = { ...p }; delete n[holeId]; return n }), [])

  async function handleGuardar() {
    setSaving(true); setSavedMsg(null)
    try {
      const jugEntries = Object.entries(scoresJug).map(([holeId, golpes]) => ({ holeId: +holeId, golpes }))
      await fetch(`/api/tarjeta-online/${scorecardId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: jugEntries }),
      })
      if (yoScorecardId) {
        const yoEntries = Object.entries(scoresYo).map(([holeId, golpes]) => ({ holeId: +holeId, golpes }))
        await fetch(`/api/tarjeta-online/${yoScorecardId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: yoEntries }),
        })
      }
      setSavedMsg('Guardado ✓')
      setTimeout(() => setSavedMsg(null), 2000)
    } finally { setSaving(false) }
  }

  async function handleEnviar() {
    if (!confirm('¿Enviar la tarjeta de ' + jugador.apellido + ' al buzón? Ya no podrás modificarla.')) return
    setSending(true)
    await fetch(`/api/tarjeta-online/${scorecardId}/enviar`, { method: 'POST' })
    router.push('/tarjeta-online')
  }

  function totalGross(scores: Record<number, number>, holeArr: Hole[]) {
    return holeArr.reduce((s, h) => s + (scores[h.id] ?? 0), 0)
  }

  function totalNeto(scores: Record<number, number>, hcpIndex: number, tee: Tee, holeArr: Hole[], siKey: 'siJug' | 'siYo') {
    const chp = courseHcp(hcpIndex, tee.slope, tee.rating, parTotal)
    return holeArr.reduce((s, h) => {
      const g = scores[h.id]; if (g == null) return s
      return s + Math.max(0, h.par + strokesOnHole(chp, h[siKey], n) + 2 - g)
    }, 0)
  }

  const estadoBadge: Record<string, string> = {
    SIENDO_CARGADA: 'bg-yellow-100 text-yellow-800',
    COMPLETA:       'bg-blue-100 text-blue-800',
    VALIDADA:       'bg-green-100 text-green-800',
  }
  const estadoLabel: Record<string, string> = {
    SIENDO_CARGADA: 'Siendo cargada',
    COMPLETA:       'Completa — pendiente de validación',
    VALIDADA:       'Validada ✓',
  }

  // ── Mini-tabla de una columna de hoyos ───────────────────────────────────
  const cols = marcador ? 'grid-cols-[26px_1fr_1fr]' : 'grid-cols-[26px_1fr]'

  function MiniTabla({ holeSubset }: { holeSubset: Hole[] }) {
    const grossJug = totalGross(scoresJug, holeSubset)
    const grossYo  = totalGross(scoresYo, holeSubset)
    const hasInconsistency = holeSubset.some((h) => {
      const c = crossScores[h.id]; return c != null && scoresJug[h.id] != null && scoresJug[h.id] !== c
    })

    return (
      <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${hasInconsistency ? 'border-orange-300' : 'border-gray-100'}`}>
        {/* Header */}
        <div className={`grid ${cols} bg-green-700 text-white text-xs font-semibold text-center`}>
          <div className="py-1.5">H</div>
          <div className="py-1.5 border-l border-green-600 truncate px-0.5">
            {jugador.apellido.substring(0, 7).toUpperCase()}.
          </div>
          {marcador && (
            <div className="py-1.5 border-l border-green-600">YO</div>
          )}
        </div>

        {/* Filas */}
        {holeSubset.map((h) => {
          const crossGolpes = crossScores[h.id]
          const inconsistente = scoresJug[h.id] != null && crossGolpes != null && scoresJug[h.id] !== crossGolpes
          return (
            <div key={h.id} className={`grid ${cols} border-t border-gray-100 items-center ${inconsistente ? 'bg-orange-50' : ''}`}>
              {/* Hoyo */}
              <div className="text-center py-1">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-white text-[11px] font-bold">{h.numero}</span>
                <div className="text-[9px] text-gray-400 leading-tight">{h.par}/{h.siJug}</div>
                {inconsistente && <div className="text-[9px] text-orange-600 font-bold">⚠</div>}
              </div>
              {/* JUG */}
              <div className="py-1 px-0.5 border-l border-gray-100">
                <CeldaGolpes
                  golpes={scoresJug[h.id]} par={h.par}
                  onChange={(v) => setJug(h.id, v)} onClear={() => clearJug(h.id)}
                  disabled={!canEdit} inconsistente={inconsistente}
                />
                {inconsistente && (
                  <div className="text-[9px] text-orange-500 text-center leading-tight">Jug:{crossGolpes}</div>
                )}
              </div>
              {/* YO */}
              {marcador && (
                <div className="py-1 px-0.5 border-l border-gray-100">
                  <CeldaGolpes
                    golpes={scoresYo[h.id]} par={h.parYo}
                    onChange={(v) => setYo(h.id, v)} onClear={() => clearYo(h.id)}
                    disabled={!canEdit}
                  />
                </div>
              )}
            </div>
          )
        })}

        {/* Subtotal */}
        <div className={`grid ${cols} border-t-2 border-gray-200 bg-gray-50 text-xs font-bold text-center`}>
          <div className="py-1.5 text-gray-400 text-[10px]">tot</div>
          <div className="py-1.5 border-l border-gray-200 text-green-800">{grossJug || '—'}</div>
          {marcador && (
            <div className="py-1.5 border-l border-gray-200 text-green-800">{grossYo || '—'}</div>
          )}
        </div>
      </div>
    )
  }

  // Dividir hoyos en dos columnas
  const mid      = Math.ceil(holeList.length / 2)
  const leftHoles = holeList.slice(0, mid)
  const rightHoles = holeList.slice(mid)

  // Totales generales
  const grossJugTotal = totalGross(scoresJug, [...ida, ...vuelta])
  const grossYoTotal  = totalGross(scoresYo,  [...ida, ...vuelta])
  const netJug = grossJugTotal ? grossJugTotal - chpJug : null
  const netYo  = grossYoTotal  ? grossYoTotal  - chpYo  : null

  return (
    <div className="space-y-3">
      {/* Header jugador */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-gray-900">
              {jugador.apellido.toUpperCase()}, {jugador.nombre.toUpperCase()}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              HCP {jugador.hcpIndex.toFixed(1)} · Tee {teeJug.nombre} · Course HCP {chpJug}
            </p>
            {marcador && (
              <p className="text-xs text-gray-400 mt-0.5">
                Marker: {marcador.apellido}, {marcador.nombre} · HCP {marcador.hcpIndex.toFixed(1)}
              </p>
            )}
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${estadoBadge[estado] ?? 'bg-gray-100 text-gray-600'}`}>
            {estadoLabel[estado] ?? estado}
          </span>
        </div>
      </div>

      {/* Banner inconsistencias */}
      {holeList.some((h) => {
        const c = crossScores[h.id]; return c != null && scoresJug[h.id] != null && scoresJug[h.id] !== c
      }) && (
        <div className="bg-orange-100 border border-orange-300 rounded-xl p-3 flex items-start gap-2">
          <span className="text-orange-500">⚠</span>
          <div>
            <p className="font-semibold text-orange-800 text-sm">Inconsistencia detectada</p>
            <p className="text-xs text-orange-600 mt-0.5">El marcador y el jugador anotaron golpes diferentes.</p>
          </div>
        </div>
      )}

      {/* Selector IDA / VUELTA (solo 18 hoyos) */}
      {isEighteen && (
        <div className="flex gap-2">
          {(['IDA', 'VUELTA'] as const).map((v) => (
            <button key={v} onClick={() => setVista(v)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                vista === v ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >{v}</button>
          ))}
        </div>
      )}

      {/* Grilla — 2 columnas de hoyos */}
      <div className="grid grid-cols-2 gap-2">
        <MiniTabla holeSubset={leftHoles} />
        <MiniTabla holeSubset={rightHoles} />
      </div>

      {/* Resumen total */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <div className={`grid ${marcador ? 'grid-cols-2' : 'grid-cols-1'} gap-3 text-center text-sm`}>
          <div>
            <p className="text-xs text-gray-400 mb-1">{jugador.apellido.toUpperCase()} · HCP {chpJug}</p>
            <p className="font-bold text-gray-900">
              Gross: {grossJugTotal || '—'}
              {netJug !== null && <span className="ml-2 text-green-700">Net: {netJug}</span>}
            </p>
          </div>
          {marcador && (
            <div>
              <p className="text-xs text-gray-400 mb-1">YO · HCP {chpYo}</p>
              <p className="font-bold text-gray-900">
                Gross: {grossYoTotal || '—'}
                {netYo !== null && <span className="ml-2 text-green-700">Net: {netYo}</span>}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      {canEdit && (
        <div className="flex gap-3">
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="flex-1 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-gray-900 font-bold py-4 rounded-xl text-lg transition-colors"
          >
            {saving ? 'Guardando...' : savedMsg ?? 'GUARDAR'}
          </button>
          <button
            onClick={handleEnviar}
            disabled={sending}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-colors"
          >
            {sending ? 'Enviando...' : 'ENVIAR AL BUZÓN'}
          </button>
        </div>
      )}
    </div>
  )
}
