'use client'

import { useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

type Hole = {
  id:                 number
  numero:             number
  par:                number
  parDamas:           number | null
  handicapIndex:      number
  handicapIndexDamas: number | null
}

type TeeHoyo = { holeId: number; yardas: number | null }

type Tee = {
  id:          number
  nombre:      string
  color:       string
  slope:       number | null
  slopeIda:    number | null
  slopeVuelta: number | null
  rating:      number | null
  hoyos:       TeeHoyo[]
}

interface Props {
  canchaId: number
  holes:    Hole[]
  tees:     Tee[]
}

// ── Preset colors ──────────────────────────────────────────────────────────

const COLORES_PRESET = [
  { label: 'Negro',    hex: '#1F2937' },
  { label: 'Azul',     hex: '#1D4ED8' },
  { label: 'Blanco',   hex: '#E5E7EB' },
  { label: 'Amarillo', hex: '#F59E0B' },
  { label: 'Rojo',     hex: '#DC2626' },
  { label: 'Verde',    hex: '#16A34A' },
  { label: 'Naranja',  hex: '#EA580C' },
  { label: 'Violeta',  hex: '#7C3AED' },
]

// ── Sub-components ─────────────────────────────────────────────────────────

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {COLORES_PRESET.map((c) => (
        <button
          key={c.hex}
          type="button"
          title={c.label}
          onClick={() => onChange(c.hex)}
          className={`w-7 h-7 rounded-full border-2 transition-transform ${
            value === c.hex ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
          }`}
          style={{ backgroundColor: c.hex }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title="Color personalizado"
        className="w-7 h-7 rounded cursor-pointer border border-gray-300"
      />
    </div>
  )
}

// ── Yardas table ───────────────────────────────────────────────────────────

function YardasTable({
  holes,
  teeId,
  initialHoyos,
  canchaId,
}: {
  holes:        Hole[]
  teeId:        number
  initialHoyos: TeeHoyo[]
  canchaId:     number
}) {
  const toMap = (hoyos: TeeHoyo[]): Record<number, number | ''> => {
    const m: Record<number, number | ''> = {}
    for (const h of hoyos) m[h.holeId] = h.yardas ?? ''
    return m
  }

  const [values, setValues] = useState<Record<number, number | ''>>(() => toMap(initialHoyos))
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const set = (holeId: number, val: string) => {
    setSaved(false)
    setValues((prev) => ({ ...prev, [holeId]: val === '' ? '' : Number(val) }))
  }

  const totalYards = holes.reduce((s, h) => {
    const v = values[h.id]
    return s + (typeof v === 'number' ? v : 0)
  }, 0)

  const ida    = holes.slice(0, 9).reduce((s, h) => s + (typeof values[h.id] === 'number' ? (values[h.id] as number) : 0), 0)
  const vuelta = holes.slice(9).reduce((s, h)  => s + (typeof values[h.id] === 'number' ? (values[h.id] as number) : 0), 0)
  const parIda    = holes.slice(0, 9).reduce((s, h) => s + h.par, 0)
  const parVuelta = holes.slice(9).reduce((s, h)  => s + h.par, 0)
  const parIdaD   = holes.slice(0, 9).reduce((s, h) => s + (h.parDamas ?? h.par), 0)
  const parVueltaD= holes.slice(9).reduce((s, h)  => s + (h.parDamas ?? h.par), 0)

  const parLabel  = (h: Hole) => h.parDamas !== null && h.parDamas !== h.par
    ? <span><span className="text-blue-600">{h.par}</span><span className="text-gray-300">/</span><span className="text-pink-500">{h.parDamas}</span></span>
    : <span>{h.par}</span>

  const hcpLabel  = (h: Hole) => h.handicapIndexDamas !== null && h.handicapIndexDamas !== h.handicapIndex
    ? <span><span className="text-blue-600">{h.handicapIndex}</span><span className="text-gray-300">/</span><span className="text-pink-500">{h.handicapIndexDamas}</span></span>
    : <span>{h.handicapIndex}</span>

  async function save() {
    setSaving(true)
    setError(null)
    const hoyos = holes.map((h) => ({
      holeId: h.id,
      yardas: typeof values[h.id] === 'number' ? (values[h.id] as number) : null,
    }))
    const res = await fetch(`/api/ajustes/canchas/${canchaId}/tees/${teeId}/yardas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hoyos }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
    } else {
      setError('Error al guardar las yardas')
    }
  }

  const input =
    'w-14 text-center text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500'

  const SubtotalRow = ({
    label, parC, parD, yardas,
  }: { label: string; parC: number; parD: number; yardas: number }) => (
    <tr className="bg-green-50 font-semibold text-xs">
      <td className="px-2 py-1.5 text-center text-gray-600">{label}</td>
      <td className="px-2 py-1.5 text-center">
        {parC === parD
          ? <span className="text-gray-800">{parC}</span>
          : <span><span className="text-blue-600">{parC}</span><span className="text-gray-300">/</span><span className="text-pink-500">{parD}</span></span>}
      </td>
      <td className="px-2 py-1.5 text-center text-gray-400">—</td>
      <td className="px-2 py-1.5 text-center text-green-700">{yardas || '—'}</td>
    </tr>
  )

  return (
    <div className="mt-4">
      {/* Legend */}
      <p className="text-xs text-gray-400 mb-2">
        Par/HI en <span className="text-blue-600 font-medium">azul</span> = Caballeros ·{' '}
        <span className="text-pink-500 font-medium">rosa</span> = Damas (cuando difieren)
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-2 py-2 text-center font-medium w-10">Hoyo</th>
              <th className="px-2 py-2 text-center font-medium w-14">Par</th>
              <th className="px-2 py-2 text-center font-medium w-14">HI</th>
              <th className="px-2 py-2 text-center font-medium w-16">Yardas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {holes.map((h, idx) => (
              <>
                <tr key={h.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-2 py-1.5 text-center font-medium text-gray-700">{h.numero}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600 text-xs">{parLabel(h)}</td>
                  <td className="px-2 py-1.5 text-center text-gray-400 text-xs">{hcpLabel(h)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="number"
                      min={0}
                      max={700}
                      value={values[h.id] ?? ''}
                      onChange={(e) => set(h.id, e.target.value)}
                      className={input}
                      placeholder="—"
                    />
                  </td>
                </tr>
                {h.numero === 9 && (
                  <SubtotalRow key="ida" label="Ida (1-9)" parC={parIda} parD={parIdaD} yardas={ida} />
                )}
              </>
            ))}
            {holes.length === 18 && (
              <SubtotalRow label="Vuelta (10-18)" parC={parVuelta} parD={parVueltaD} yardas={vuelta} />
            )}
            <tr className="bg-gray-100 font-bold text-sm border-t-2 border-gray-300">
              <td className="px-2 py-2 text-center text-gray-700">Total</td>
              <td className="px-2 py-2 text-center text-xs">
                {(parIda + parVuelta) === (parIdaD + parVueltaD)
                  ? <span className="text-gray-800">{parIda + parVuelta}</span>
                  : <span><span className="text-blue-600">{parIda + parVuelta}</span><span className="text-gray-400">/</span><span className="text-pink-500">{parIdaD + parVueltaD}</span></span>}
              </td>
              <td className="px-2 py-2 text-center text-gray-400">—</td>
              <td className="px-2 py-2 text-center text-green-700">
                {totalYards > 0 ? totalYards.toLocaleString() : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-3 px-4 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50
          bg-green-600 text-white hover:bg-green-700"
      >
        {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar yardas'}
      </button>
    </div>
  )
}

// ── Tee card ───────────────────────────────────────────────────────────────

function TeeCard({
  tee,
  holes,
  canchaId,
  onUpdate,
  onDelete,
}: {
  tee:      Tee
  holes:    Hole[]
  canchaId: number
  onUpdate: (updated: Tee) => void
  onDelete: (id: number) => void
}) {
  const [expanded, setExpanded]   = useState(false)
  const [editing,  setEditing]    = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [saving,   setSaving]     = useState(false)
  const [error,    setError]      = useState<string | null>(null)

  const [nombre,      setNombre]      = useState(tee.nombre)
  const [color,       setColor]       = useState(tee.color)
  const [slope,       setSlope]       = useState<number | ''>(tee.slope ?? '')
  const [slopeIda,    setSlopeIda]    = useState<number | ''>(tee.slopeIda ?? '')
  const [slopeVuelta, setSlopeVuelta] = useState<number | ''>(tee.slopeVuelta ?? '')
  const [rating,      setRating]      = useState<number | ''>(tee.rating ?? '')

  async function saveEdit() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/ajustes/canchas/${canchaId}/tees/${tee.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        color,
        slope:       slope       === '' ? null : Number(slope),
        slopeIda:    slopeIda    === '' ? null : Number(slopeIda),
        slopeVuelta: slopeVuelta === '' ? null : Number(slopeVuelta),
        rating:      rating      === '' ? null : Number(rating),
      }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      onUpdate({ ...tee, nombre: updated.nombre, color: updated.color, slope: updated.slope, slopeIda: updated.slopeIda, slopeVuelta: updated.slopeVuelta, rating: updated.rating })
      setEditing(false)
    } else {
      setError('Error al guardar')
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    const res = await fetch(`/api/ajustes/canchas/${canchaId}/tees/${tee.id}`, { method: 'DELETE' })
    if (res.ok) {
      onDelete(tee.id)
    } else {
      setDeleting(false)
      setError('Error al eliminar')
    }
  }

  const isDark = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 < 128
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Color dot */}
        <span
          className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
          style={{ backgroundColor: tee.color }}
        />

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nombre del tee</label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-36 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: Azul"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Slope general</label>
                  <input type="number" min={55} max={155} value={slope}
                    onChange={(e) => setSlope(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="113" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Slope IDA</label>
                  <input type="number" min={55} max={155} value={slopeIda}
                    onChange={(e) => setSlopeIda(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="—" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Slope VUELTA</label>
                  <input type="number" min={55} max={155} value={slopeVuelta}
                    onChange={(e) => setSlopeVuelta(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="—" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rating</label>
                  <input type="number" min={55} max={85} step={0.1} value={rating}
                    onChange={(e) => setRating(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="72.0" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Color</label>
                <ColorPicker value={color} onChange={setColor} />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving || !nombre}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setNombre(tee.nombre); setColor(tee.color); setSlope(tee.slope ?? ''); setSlopeIda(tee.slopeIda ?? ''); setSlopeVuelta(tee.slopeVuelta ?? ''); setRating(tee.rating ?? '') }}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-gray-900">{tee.nombre}</span>
              {(tee.slope || tee.rating) && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {tee.slopeIda && tee.slopeVuelta
                    ? `Slope ${tee.slopeIda}/${tee.slopeVuelta}`
                    : tee.slope ? `Slope ${tee.slope}` : ''}
                  {(tee.slope || tee.slopeIda) && tee.rating && ' · '}
                  {tee.rating && `Rating ${tee.rating}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-xs"
              title="Editar tee"
            >
              ✎
            </button>
            {!deleting ? (
              <button
                type="button"
                onClick={confirmDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs"
                title="Eliminar tee"
              >
                ✕
              </button>
            ) : (
              <span className="text-xs text-gray-400">Eliminando…</span>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors ml-1"
              title={expanded ? 'Ocultar yardas' : 'Ver / editar yardas'}
            >
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        )}
      </div>

      {/* Yardas table (expandable) */}
      {expanded && !editing && (
        <div className="border-t border-gray-100 px-5 pb-5">
          {holes.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
              Esta cancha no tiene hoyos cargados. Contactá al administrador para agregarlos.
            </p>
          ) : (
            <YardasTable
              holes={holes}
              teeId={tee.id}
              initialHoyos={tee.hoyos}
              canchaId={canchaId}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Add tee form ───────────────────────────────────────────────────────────

function AddTeeForm({
  canchaId,
  onAdded,
  onCancel,
}: {
  canchaId: number
  onAdded:  (tee: Tee) => void
  onCancel: () => void
}) {
  const [nombre,      setNombre]      = useState('')
  const [color,       setColor]       = useState('#1D4ED8')
  const [slope,       setSlope]       = useState<number | ''>('')
  const [slopeIda,    setSlopeIda]    = useState<number | ''>('')
  const [slopeVuelta, setSlopeVuelta] = useState<number | ''>('')
  const [rating,      setRating]      = useState<number | ''>('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/ajustes/canchas/${canchaId}/tees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        color,
        slope:       slope       === '' ? null : Number(slope),
        slopeIda:    slopeIda    === '' ? null : Number(slopeIda),
        slopeVuelta: slopeVuelta === '' ? null : Number(slopeVuelta),
        rating:      rating      === '' ? null : Number(rating),
      }),
    })
    setSaving(false)
    if (res.ok) {
      const tee = await res.json()
      onAdded({ id: tee.id, nombre: tee.nombre, color: tee.color, slope: tee.slope, slopeIda: tee.slopeIda ?? null, slopeVuelta: tee.slopeVuelta ?? null, rating: tee.rating, hoyos: [] })
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Error al crear el tee')
    }
  }

  const field =
    'px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <form
      onSubmit={submit}
      className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4"
    >
      <h3 className="font-semibold text-green-900 text-sm">Nuevo tee de salida</h3>

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Nombre *</label>
          <input
            required
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={`${field} w-36`}
            placeholder="Ej: Azul"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Slope general</label>
          <input
            type="number"
            min={55}
            max={155}
            value={slope}
            onChange={(e) => setSlope(e.target.value === '' ? '' : Number(e.target.value))}
            className={`${field} w-20`}
            placeholder="113"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Slope IDA</label>
          <input
            type="number"
            min={55}
            max={155}
            value={slopeIda}
            onChange={(e) => setSlopeIda(e.target.value === '' ? '' : Number(e.target.value))}
            className={`${field} w-20`}
            placeholder="—"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Slope VUELTA</label>
          <input
            type="number"
            min={55}
            max={155}
            value={slopeVuelta}
            onChange={(e) => setSlopeVuelta(e.target.value === '' ? '' : Number(e.target.value))}
            className={`${field} w-20`}
            placeholder="—"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Rating</label>
          <input
            type="number"
            min={55}
            max={85}
            step={0.1}
            value={rating}
            onChange={(e) => setRating(e.target.value === '' ? '' : Number(e.target.value))}
            className={`${field} w-20`}
            placeholder="72.0"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1.5">Color del marcador</label>
        <ColorPicker value={color} onChange={setColor} />
        <div className="mt-2 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: color,
              color: (() => {
                const r = parseInt(color.slice(1,3),16)
                const g = parseInt(color.slice(3,5),16)
                const b = parseInt(color.slice(5,7),16)
                return (r*299+g*587+b*114)/1000 < 128 ? '#fff' : '#1F2937'
              })(),
            }}
          >
            {nombre || 'Tee'}
          </span>
          <span className="text-xs text-gray-400">Vista previa</span>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !nombre}
          className="px-4 py-2 text-sm rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Creando…' : 'Crear tee'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ── HoyosEditor ────────────────────────────────────────────────────────────

function HoyosEditor({ canchaId, initialHoles }: { canchaId: number; initialHoles: Hole[] }) {
  type RowVal = { par: number | ''; parDamas: number | ''; hcp: number | ''; hcpDamas: number | '' }

  const toRows = (holes: Hole[]): Record<number, RowVal> =>
    Object.fromEntries(
      holes.map((h) => [h.numero, {
        par:      h.par,
        parDamas: h.parDamas ?? '',
        hcp:      h.handicapIndex,
        hcpDamas: h.handicapIndexDamas ?? '',
      }])
    )

  const [rows,   setRows]   = useState<Record<number, RowVal>>(() => toRows(initialHoles))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [open,   setOpen]   = useState(false)

  const nums = Array.from({ length: 18 }, (_, i) => i + 1)

  const upd = (n: number, field: keyof RowVal, val: string) => {
    setSaved(false)
    setRows((prev) => ({
      ...prev,
      [n]: { ...prev[n], [field]: val === '' ? '' : Number(val) },
    }))
  }

  async function save() {
    setSaving(true); setError(null)
    const hoyos = nums.map((n) => {
      const r = rows[n] ?? { par: 4, parDamas: '', hcp: n, hcpDamas: '' }
      return {
        numero:             n,
        par:                typeof r.par === 'number' ? r.par : 4,
        parDamas:           typeof r.parDamas === 'number' ? r.parDamas : null,
        handicapIndex:      typeof r.hcp === 'number' ? r.hcp : n,
        handicapIndexDamas: typeof r.hcpDamas === 'number' ? r.hcpDamas : null,
      }
    })
    const res = await fetch(`/api/ajustes/canchas/${canchaId}/hoyos`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hoyos }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true) } else { setError('Error al guardar') }
  }

  const inp = 'w-12 text-center text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="text-left">
          <h2 className="text-base font-semibold text-gray-900">Hoyos — Par y Handicap</h2>
          <p className="text-xs text-gray-500 mt-0.5">Par y HCP por hoyo, separados por género</p>
        </div>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 pb-5">
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                  <th className="px-2 py-2 text-center font-medium w-10">Hoyo</th>
                  <th className="px-2 py-2 text-center font-medium text-blue-600">Par ♂</th>
                  <th className="px-2 py-2 text-center font-medium text-pink-500">Par ♀</th>
                  <th className="px-2 py-2 text-center font-medium text-blue-600">HCP ♂</th>
                  <th className="px-2 py-2 text-center font-medium text-pink-500">HCP ♀</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {nums.map((n, idx) => {
                  const r = rows[n] ?? { par: '', parDamas: '', hcp: '', hcpDamas: '' }
                  return (
                    <tr key={n} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${n === 9 ? 'border-b-2 border-green-200' : ''}`}>
                      <td className="px-2 py-1.5 text-center font-semibold text-gray-700">{n}</td>
                      <td className="px-2 py-1.5 text-center">
                        <input type="number" min={3} max={5} value={r.par}
                          onChange={(e) => upd(n, 'par', e.target.value)}
                          className={`${inp} text-blue-700`} placeholder="4" />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input type="number" min={3} max={5} value={r.parDamas}
                          onChange={(e) => upd(n, 'parDamas', e.target.value)}
                          className={`${inp} text-pink-600`} placeholder="—" />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input type="number" min={1} max={18} value={r.hcp}
                          onChange={(e) => upd(n, 'hcp', e.target.value)}
                          className={`${inp} text-blue-700`} placeholder="1" />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input type="number" min={1} max={18} value={r.hcpDamas}
                          onChange={(e) => upd(n, 'hcpDamas', e.target.value)}
                          className={`${inp} text-pink-600`} placeholder="—" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Dejar ♀ vacío = mismo valor que ♂
          </p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="mt-3 px-4 py-1.5 text-sm rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar hoyos'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main editor ────────────────────────────────────────────────────────────

export default function CanchaEditor({ canchaId, holes, tees: initialTees }: Props) {
  const [tees,    setTees]    = useState<Tee[]>(initialTees)
  const [adding,  setAdding]  = useState(false)

  const handleAdded = useCallback((tee: Tee) => {
    setTees((prev) => [...prev, tee].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setAdding(false)
  }, [])

  const handleUpdate = useCallback((updated: Tee) => {
    setTees((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }, [])

  const handleDelete = useCallback((id: number) => {
    setTees((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <div className="space-y-4">
      {/* Holes editor */}
      <HoyosEditor canchaId={canchaId} initialHoles={holes} />

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Tees de salida</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cada tee tiene su propio slope, rating y yardas por hoyo
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 text-sm rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            + Agregar tee
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <AddTeeForm
          canchaId={canchaId}
          onAdded={handleAdded}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Tee list */}
      {tees.length === 0 && !adding ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">No hay tees configurados</p>
          <p className="text-xs text-gray-400 mt-1">Hacé clic en &quot;Agregar tee&quot; para empezar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tees.map((t) => (
            <TeeCard
              key={t.id}
              tee={t}
              holes={holes}
              canchaId={canchaId}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Holes info */}
      {holes.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {holes.length} hoyos · Par {holes.reduce((s, h) => s + h.par, 0)}
        </p>
      )}
    </div>
  )
}
