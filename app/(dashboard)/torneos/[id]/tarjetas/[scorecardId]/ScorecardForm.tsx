'use client'

import { useState, useRef, useCallback, type MutableRefObject, type RefObject } from 'react'
import { useRouter } from 'next/navigation'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Hole {
  id:            number
  numero:        number
  par:           number
  handicapIndex: number
}

interface Props {
  scorecardId: number
  torneoId: number
  playerName: string
  hcpIndex: number
  slopeAzul: number
  ratingAzul: number
  par: number  // par total del torneo (18 o 9 hoyos)
  holes: Hole[]
  initialScores: Record<number, number>  // holeId → golpes
  canEdit: boolean
  isEighteen: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Course Handicap = round(HCP Index × (Slope / 113) + (Course Rating − Par)) */
function courseHcp(hcpIndex: number, slope: number, rating: number, par: number): number {
  return Math.round(hcpIndex * slope / 113 + (rating - par))
}

/**
 * Strokes recibidos en un hoyo.
 * Si course HCP = 15, recibe stroke en hoyos con SI 1-15.
 * Si course HCP = 20, recibe 2 strokes en SI 1-2, 1 stroke en SI 3-18.
 */
function strokesOnHole(courseHcpVal: number, si: number, totalHoles: number): number {
  const full = Math.floor(courseHcpVal / totalHoles)
  const remainder = courseHcpVal % totalHoles
  return full + (si <= remainder ? 1 : 0)
}

/** Puntos Stableford netos en un hoyo */
function stablefordPts(grossScore: number, par: number, strokes: number): number {
  return Math.max(0, par + strokes + 2 - grossScore)
}

// ── HoleGrid ─────────────────────────────────────────────────────────────────
// IMPORTANT: defined at module level (outside ScorecardForm) so React never
// unmounts/remounts it when ScorecardForm re-renders on score changes.
// Defining it inside ScorecardForm creates a new function reference every
// render, which React treats as a different component type and fully remounts,
// destroying focus and breaking Tab navigation.

interface HoleGridProps {
  holeList:      Hole[]
  allHoles:      Hole[]   // full ordered list — needed for Tab indexOf
  label:         string
  parSum:        number
  scores:        Record<number, string>
  chcp:          number
  totalHoles:    number
  canEdit:       boolean
  inputRefs:     MutableRefObject<Record<number, HTMLInputElement | null>>
  saveButtonRef: RefObject<HTMLButtonElement | null>
  onKeyDown:     (e: React.KeyboardEvent<HTMLInputElement>, holeId: number, idx: number) => void
  onChange:      (holeId: number, val: string) => void
}

function HoleGrid({
  holeList, allHoles, label, parSum, scores,
  chcp, totalHoles, canEdit, inputRefs, saveButtonRef, onKeyDown, onChange,
}: HoleGridProps) {
  const getScore = (holeId: number) => {
    const v = scores[holeId]
    return v !== undefined && v !== '' ? Number(v) : null
  }

  const scoreSum = holeList.reduce((acc, h) => {
    const s = getScore(h.id)
    return s !== null ? acc + s : acc
  }, 0)
  const defined = holeList.filter((h) => getScore(h.id) !== null).length

  const inputCls = (holeId: number) => {
    const v = getScore(holeId)
    const hole = allHoles.find((h) => h.id === holeId)!
    const diff = v !== null ? v - hole.par : null

    let bg = 'bg-white'
    if (diff !== null) {
      if (diff <= -2) bg = 'bg-yellow-100'       // eagle+
      else if (diff === -1) bg = 'bg-green-100'   // birdie
      else if (diff === 0) bg = 'bg-white'         // par
      else if (diff === 1) bg = 'bg-red-50'        // bogey
      else bg = 'bg-red-100'                       // doble+
    }

    return `w-10 text-center py-1.5 text-sm font-medium border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-400 ${bg} ${!canEdit ? 'cursor-default' : ''}`
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-2 text-left font-semibold text-gray-500 w-16">{label}</th>
            {holeList.map((h) => (
              <th key={h.id} className="px-1 py-2 text-center font-semibold text-gray-700 min-w-[2.5rem]">
                {h.numero}
              </th>
            ))}
            <th className="px-2 py-2 text-center font-bold text-gray-700 min-w-[3rem]">
              {label === 'IDA' ? 'OUT' : 'IN'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {/* Par */}
          <tr className="bg-gray-50/50">
            <td className="px-2 py-1.5 text-gray-500 font-medium">Par</td>
            {holeList.map((h) => (
              <td key={h.id} className="px-1 py-1.5 text-center text-gray-700">{h.par}</td>
            ))}
            <td className="px-2 py-1.5 text-center font-bold text-gray-700">{parSum}</td>
          </tr>
          {/* SI */}
          <tr>
            <td className="px-2 py-1.5 text-gray-400">SI</td>
            {holeList.map((h) => (
              <td key={h.id} className="px-1 py-1.5 text-center text-gray-400">{h.handicapIndex}</td>
            ))}
            <td className="px-2 py-1.5 text-center text-gray-400">—</td>
          </tr>
          {/* Strokes */}
          <tr>
            <td className="px-2 py-1.5 text-blue-500">Strks</td>
            {holeList.map((h) => {
              const s = strokesOnHole(chcp, h.handicapIndex, totalHoles)
              return (
                <td key={h.id} className="px-1 py-1.5 text-center text-blue-500">
                  {s > 0 ? s : ''}
                </td>
              )
            })}
            <td className="px-2 py-1.5 text-center text-blue-500 font-medium">
              {holeList.reduce((a, h) => a + strokesOnHole(chcp, h.handicapIndex, totalHoles), 0)}
            </td>
          </tr>
          {/* Score */}
          <tr className="bg-white">
            <td className="px-2 py-1.5 font-semibold text-gray-700">Score</td>
            {holeList.map((h) => (
              <td key={h.id} className="px-1 py-1.5 text-center">
                <input
                  ref={(el) => { inputRefs.current[h.id] = el }}
                  type="text"
                  inputMode="numeric"
                  value={scores[h.id] ?? ''}
                  onChange={(e) => onChange(h.id, e.target.value)}
                  onKeyDown={(e) => {
                    const idx = allHoles.indexOf(h)
                    const isLast = idx === allHoles.length - 1
                    if (isLast && (e.key === 'Tab' || e.key === 'Enter')) {
                      e.preventDefault()
                      saveButtonRef.current?.focus()
                    } else {
                      onKeyDown(e, h.id, idx)
                    }
                  }}
                  disabled={!canEdit}
                  className={inputCls(h.id)}
                  maxLength={2}
                  placeholder={String(h.par)}
                  aria-label={`Hoyo ${h.numero}`}
                />
              </td>
            ))}
            <td className="px-2 py-1.5 text-center font-bold text-gray-900">
              {defined > 0 ? scoreSum : '—'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ScorecardForm({
  scorecardId,
  torneoId,
  playerName,
  hcpIndex,
  slopeAzul,
  ratingAzul,
  par: parTotal,
  holes,
  initialScores,
  canEdit,
  isEighteen,
}: Props) {
  const router = useRouter()
  const [scores, setScores] = useState<Record<number, string>>(
    Object.fromEntries(
      Object.entries(initialScores).map(([k, v]) => [k, String(v)])
    )
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs    = useRef<Record<number, HTMLInputElement | null>>({})
  const saveButtonRef = useRef<HTMLButtonElement | null>(null)

  const chcp = courseHcp(hcpIndex, slopeAzul, ratingAzul, parTotal)
  const totalHoles = isEighteen ? 18 : 9

  // Calcular totales en tiempo real
  const getScore = (holeId: number) => {
    const v = scores[holeId]
    return v !== undefined && v !== '' ? Number(v) : null
  }

  const holeOut = holes.filter((h) => h.numero <= 9)
  const holeIn = isEighteen ? holes.filter((h) => h.numero >= 10) : []

  const sumScores = (hs: Hole[]) =>
    hs.reduce((acc, h) => {
      const s = getScore(h.id)
      return s !== null ? acc + s : acc
    }, 0)

  const countDefined = (hs: Hole[]) => hs.filter((h) => getScore(h.id) !== null).length

  const outScore = sumScores(holeOut)
  const inScore = sumScores(holeIn)
  const grossTotal = outScore + inScore
  const netTotal = grossTotal - chcp

  const outPar = holeOut.reduce((a, h) => a + h.par, 0)
  const inPar = holeIn.reduce((a, h) => a + h.par, 0)

  const stablefordTotal = holes.reduce((acc, h) => {
    const s = getScore(h.id)
    if (s === null) return acc
    const strokes = strokesOnHole(chcp, h.handicapIndex, totalHoles)
    return acc + stablefordPts(s, h.par, strokes)
  }, 0)

  // ── Navegación con teclas ─────────────────────────────────────────────────

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    _holeId: number,
    idx: number,
  ) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const nextHole = holes[idx + 1]
      if (nextHole) inputRefs.current[nextHole.id]?.focus()
    }
  }, [holes])

  function handleChange(holeId: number, val: string) {
    // Only allow 1-2 digit numbers
    if (val !== '' && !/^\d{1,2}$/.test(val)) return
    setScores((prev) => ({ ...prev, [holeId]: val }))
    setSaved(false)
  }

  // ── Guardar ───────────────────────────────────────────────────────────────

  async function handleSave() {
    const entries = holes
      .map((h) => ({ holeId: h.id, golpes: Number(scores[h.id]) }))
      .filter((e) => !isNaN(e.golpes) && e.golpes > 0)

    if (entries.length === 0) {
      setError('Ingresá al menos un score')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/torneos/${torneoId}/tarjetas/${scorecardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
      } else {
        setSaved(true)
        if (allDefined) {
          router.push(`/torneos/${torneoId}/tarjetas`)
        } else {
          router.refresh()
        }
      }
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const allDefined = countDefined(holes) === holes.length

  const gridProps = {
    allHoles:      holes,
    scores,
    chcp,
    totalHoles,
    canEdit,
    inputRefs,
    saveButtonRef,
    onKeyDown:     handleKeyDown,
    onChange:      handleChange,
  }

  return (
    <div className="space-y-6">
      {/* Info del jugador */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Jugador</p>
          <p className="font-bold text-gray-900 text-lg">{playerName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">HCP Index</p>
          <p className="font-semibold text-gray-700">{hcpIndex.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Course HCP</p>
          <p className="font-semibold text-blue-700 text-lg">{chcp}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Par cancha</p>
          <p className="font-semibold text-gray-700">{parTotal}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Slope/Rating</p>
          <p className="font-semibold text-gray-700">{slopeAzul} / {ratingAzul}</p>
        </div>
      </div>

      {/* Grilla IDA */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <HoleGrid {...gridProps} holeList={holeOut} label="IDA" parSum={outPar} />
      </div>

      {/* Grilla VUELTA */}
      {isEighteen && holeIn.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <HoleGrid {...gridProps} holeList={holeIn} label="VUELTA" parSum={inPar} />
        </div>
      )}

      {/* Leyenda colores */}
      <div className="flex gap-3 flex-wrap text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 inline-block border border-yellow-200" /> Eagle+</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 inline-block border border-green-200" /> Birdie</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white inline-block border border-gray-200" /> Par</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 inline-block border border-red-200" /> Bogey</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block border border-red-200" /> Doble+</span>
      </div>

      {/* Resumen de totales */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        {/* Fila: IDA · VUELTA · GROSS · NETO · Guardar */}
        <div className="flex items-end gap-4 flex-wrap">
          {isEighteen && (
            <>
              <TotalBox label="IDA" value={outScore || '—'} sub={`par ${outPar}`} />
              <TotalBox label="VUELTA" value={inScore || '—'} sub={`par ${inPar}`} />
            </>
          )}
          <TotalBox
            label="GROSS"
            value={grossTotal || '—'}
            sub={grossTotal ? `${grossTotal > parTotal ? '+' : ''}${grossTotal - parTotal}` : ''}
            highlight
          />
          <TotalBox
            label="NETO"
            value={netTotal || '—'}
            sub={`HCP ${chcp}`}
            highlight
          />

          {/* Botón guardar inline */}
          {canEdit && (
            <div className="flex flex-col gap-1 pb-0.5">
              <button
                ref={saveButtonRef}
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {saving ? 'Guardando...' : 'Guardar tarjeta'}
              </button>
              {saved  && <span className="text-xs text-green-600 text-center">✓ Guardada</span>}
              {error  && <span className="text-xs text-red-600">{error}</span>}
              {!allDefined && (
                <span className="text-xs text-gray-400 text-center">
                  {countDefined(holes)}/{holes.length} hoyos
                </span>
              )}
            </div>
          )}
        </div>

        {/* STABLEFORD debajo */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <TotalBox label="STABLEFORD" value={stablefordTotal} sub="pts netos" />
        </div>
      </div>

    </div>
  )
}

function TotalBox({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string
  value: number | string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-gray-50' : ''}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${highlight ? 'text-gray-900' : 'text-gray-700'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
