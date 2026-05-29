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

// Definido a nivel módulo para evitar remounts
function CeldaGolpes({ golpes, par, onChange, onClear, disabled, inconsistente }: {
  golpes: number | undefined
  par: number
  onChange: (v: number) => void
  onClear: () => void
  disabled: boolean
  inconsistente?: boolean
}) {
  const [raw, setRaw] = useState(golpes != null ? String(golpes) : '')

  // Sincronizar cuando el valor externo cambia (ej: carga inicial)
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
    if (isNaN(n) || n < 1 || n > 20) {
      // Valor inválido — restaurar al último valor guardado
      setRaw(golpes != null ? String(golpes) : '')
    }
  }

  return (
    <div className="relative flex items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={raw}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={`w-full text-center font-bold text-xl text-gray-900 border rounded-lg py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400 ${color} ${inconsistente ? '' : 'border-gray-300'}`}
      />
      {golpes != null && !disabled && (
        <button
          type="button"
          onClick={() => { setRaw(''); onClear() }}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-400 hover:bg-gray-600 text-white text-xs leading-none"
          tabIndex={-1}
        >
          ×
        </button>
      )}
      {inconsistente && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-ping" />
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
  // Cross-check: golpes que JUG anotó para sí mismo (su tarjeta YO)
  const [crossScores, setCrossScores] = useState<Record<number, number>>({})

  // Polling cross-check cada 15s
  useEffect(() => {
    if (estado === 'VALIDADA') return
    async function fetchCross() {
      const res = await fetch(`/api/tarjeta-online/${scorecardId}/cross-check`)
      if (res.ok) {
        const data = await res.json()
        setCrossScores(data.scores ?? {})
      }
    }
    fetchCross()
    const interval = setInterval(fetchCross, 15000)
    return () => clearInterval(interval)
  }, [scorecardId, estado])

  const n = holes.length
  const chpJug = courseHcp(jugador.hcpIndex, teeJug.slope, teeJug.rating, parTotal)
  const chpYo  = marcador ? courseHcp(marcador.hcpIndex, teeYo.slope, teeYo.rating, parTotal) : 0

  const ida    = holes.slice(0, isEighteen ? 9 : n)
  const vuelta = isEighteen ? holes.slice(9) : []
  const holeList = vista === 'IDA' ? ida : vuelta

  const setJug   = useCallback((holeId: number, v: number) => setScoresJug((p) => ({ ...p, [holeId]: v })), [])
  const clearJug = useCallback((holeId: number) => setScoresJug((p) => { const n = { ...p }; delete n[holeId]; return n }), [])
  const setYo    = useCallback((holeId: number, v: number) => setScoresYo((p) => ({ ...p, [holeId]: v })), [])
  const clearYo  = useCallback((holeId: number) => setScoresYo((p) => { const n = { ...p }; delete n[holeId]; return n }), [])

  async function handleGuardar() {
    setSaving(true)
    setSavedMsg(null)
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
    // Solo se envía la tarjeta de JUG — la YO es solo para control
    await fetch(`/api/tarjeta-online/${scorecardId}/enviar`, { method: 'POST' })
    router.push('/tarjeta-online')
  }

  // Totales
  function totales(scores: Record<number, number>, hcpIndex: number, tee: Tee, holeArr: Hole[], siKey: 'siJug' | 'siYo', parKey: 'par' | 'parYo') {
    let gross = 0, pts = 0
    const chp = courseHcp(hcpIndex, tee.slope, tee.rating, parTotal)
    for (const h of holeArr) {
      const g = scores[h.id]
      if (g == null) continue
      gross += g
      const str = strokesOnHole(chp, h[siKey], n)
      pts += Math.max(0, h[parKey] + str + 2 - g)
    }
    return { gross, pts }
  }

  const totJugIda    = totales(scoresJug, jugador.hcpIndex, teeJug, ida,    'siJug', 'par')
  const totJugVuelta = totales(scoresJug, jugador.hcpIndex, teeJug, vuelta, 'siJug', 'par')
  const totYoIda     = marcador ? totales(scoresYo, marcador.hcpIndex, teeYo, ida,    'siYo', 'parYo') : null
  const totYoVuelta  = marcador ? totales(scoresYo, marcador.hcpIndex, teeYo, vuelta, 'siYo', 'parYo') : null

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

  return (
    <div className="space-y-4">
      {/* Header jugador */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900 text-lg">
              {jugador.apellido.toUpperCase()}, {jugador.nombre.toUpperCase()}
            </p>
            <p className="text-sm text-gray-500">HCP {jugador.hcpIndex.toFixed(1)} · Tee {teeJug.nombre} · Course HCP {chpJug}</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${estadoBadge[estado] ?? 'bg-gray-100 text-gray-600'}`}>
            {estadoLabel[estado] ?? estado}
          </span>
        </div>
        {marcador && (
          <p className="text-xs text-gray-400 mt-1">
            Marker: {marcador.apellido}, {marcador.nombre} · HCP {marcador.hcpIndex.toFixed(1)}
          </p>
        )}
      </div>

      {/* Banner de inconsistencias */}
      {Object.keys(crossScores).length > 0 && holeList.some((h) => {
        const c = crossScores[h.id]; return c != null && scoresJug[h.id] != null && scoresJug[h.id] !== c
      }) && (
        <div className="bg-orange-100 border border-orange-300 rounded-xl p-3 flex items-start gap-2">
          <span className="text-orange-500 text-lg">⚠</span>
          <div>
            <p className="font-semibold text-orange-800 text-sm">Inconsistencia detectada</p>
            <p className="text-xs text-orange-600 mt-0.5">
              El marcador y el jugador anotaron golpes diferentes en algunos hoyos.
              Los hoyos afectados están resaltados en naranja.
            </p>
          </div>
        </div>
      )}

      {/* Selector IDA / VUELTA */}
      {isEighteen && (
        <div className="flex gap-2">
          {(['IDA', 'VUELTA'] as const).map((v) => (
            <button key={v} onClick={() => setVista(v)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                vista === v ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >{v}</button>
          ))}
        </div>
      )}

      {/* Grilla de hoyos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-5 bg-green-700 text-white text-xs font-semibold text-center">
          <div className="py-2">Hoyo</div>
          <div className="py-2 col-span-2 border-l border-green-600">
            {jugador.apellido.toUpperCase().substring(0, 8)}.
          </div>
          {marcador && <div className="py-2 col-span-2 border-l border-green-600">YO</div>}
        </div>
        <div className="grid grid-cols-5 bg-green-600 text-green-100 text-xs text-center">
          <div className="py-1">Par / SI</div>
          <div className="py-1 border-l border-green-500">+Str</div>
          <div className="py-1 border-l border-green-500">Golpes</div>
          {marcador && <>
            <div className="py-1 border-l border-green-500">+Str</div>
            <div className="py-1 border-l border-green-500">Golpes</div>
          </>}
        </div>

        {/* Filas por hoyo */}
        {holeList.map((h) => {
          const strJug = strokesOnHole(chpJug, h.siJug, n)
          const strYo  = marcador ? strokesOnHole(chpYo, h.siYo, n) : 0
          // Inconsistencia: el marcador anotó distinto a lo que JUG anotó para sí mismo
          const crossGolpes = crossScores[h.id]
          const inconsistente = scoresJug[h.id] != null && crossGolpes != null && scoresJug[h.id] !== crossGolpes
          return (
            <div key={h.id} className={`grid grid-cols-5 border-t border-gray-100 items-center ${inconsistente ? 'bg-orange-50' : ''}`}>
              <div className="text-center py-1">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-800 text-white text-xs font-bold">{h.numero}</span>
                <div className="text-xs text-gray-400 mt-0.5">{h.par} / {h.siJug}</div>
                {inconsistente && <div className="text-xs text-orange-600 font-bold">⚠</div>}
              </div>
              <div className="py-1.5 px-1 border-l border-gray-100 text-center text-xs text-gray-400">
                {strJug > 0 ? `+${strJug}` : '—'}
              </div>
              <div className="py-1.5 px-1 border-l border-gray-100">
                <CeldaGolpes golpes={scoresJug[h.id]} par={h.par} onChange={(v) => setJug(h.id, v)} onClear={() => clearJug(h.id)} disabled={!canEdit} inconsistente={inconsistente} />
                {inconsistente && (
                  <div className="text-xs text-orange-500 text-center mt-0.5">
                    Jugador: {crossGolpes}
                  </div>
                )}
              </div>
              {marcador && <>
                <div className="py-1.5 px-1 border-l border-gray-100 text-center text-xs text-gray-400">
                  {strYo > 0 ? `+${strYo}` : '—'}
                </div>
                <div className="py-1.5 px-1 border-l border-gray-100">
                  <CeldaGolpes golpes={scoresYo[h.id]} par={h.parYo} onChange={(v) => setYo(h.id, v)} onClear={() => clearYo(h.id)} disabled={!canEdit} />
                </div>
              </>}
            </div>
          )
        })}

        {/* Totales de la vista */}
        <div className="grid grid-cols-5 border-t-2 border-gray-200 bg-gray-50 text-xs font-bold text-center">
          <div className="py-2 text-gray-600">{vista}</div>
          <div className="py-2 border-l border-gray-200" />
          <div className="py-2 border-l border-gray-200 text-green-800">
            {vista === 'IDA' ? (totJugIda.gross || '—') : (totJugVuelta.gross || '—')}
          </div>
          {marcador && <>
            <div className="py-2 border-l border-gray-200" />
            <div className="py-2 border-l border-gray-200 text-green-800">
              {vista === 'IDA' ? (totYoIda?.gross || '—') : (totYoVuelta?.gross || '—')}
            </div>
          </>}
        </div>
      </div>

      {/* Resumen totales */}
      {isEighteen && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-2 gap-4 text-center text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-1">JUG · HCP {chpJug}</p>
            <p className="font-bold text-gray-900">
              Gross: {(totJugIda.gross + totJugVuelta.gross) || '—'} &nbsp;
              Net: {(totJugIda.gross + totJugVuelta.gross - chpJug) || '—'}
            </p>
          </div>
          {marcador && (
            <div>
              <p className="text-xs text-gray-400 mb-1">YO · HCP {chpYo}</p>
              <p className="font-bold text-gray-900">
                Gross: {((totYoIda?.gross ?? 0) + (totYoVuelta?.gross ?? 0)) || '—'} &nbsp;
                Net: {((totYoIda?.gross ?? 0) + (totYoVuelta?.gross ?? 0) - chpYo) || '—'}
              </p>
            </div>
          )}
        </div>
      )}

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
