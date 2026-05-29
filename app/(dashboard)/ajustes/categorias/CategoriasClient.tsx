'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────

type Gender = 'DAMA' | 'CABALLERO'

type CategoryTemplate = {
  id:       number
  genero:   Gender
  nombre:   string
  scratch:  boolean
  hcpDesde: number | null
  hcpHasta: number | null
  orden:    number
}

type CategorySet = {
  id:          number
  nombre:      string
  descripcion: string | null
  activo:      boolean
  categories:  CategoryTemplate[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

const GENDER_LABEL: Record<Gender, string> = {
  DAMA:      '♀ Dama',
  CABALLERO: '♂ Caballero',
}

const GENDER_COLOR: Record<Gender, string> = {
  DAMA:      'bg-pink-50 text-pink-700 border-pink-200',
  CABALLERO: 'bg-blue-50 text-blue-700 border-blue-200',
}

function hcpLabel(c: CategoryTemplate) {
  if (c.scratch) return 'Scratch'
  if (c.hcpDesde == null && c.hcpHasta == null) return 'Todos'
  if (c.hcpDesde == null) return `≤ ${c.hcpHasta}`
  if (c.hcpHasta == null) return `≥ ${c.hcpDesde}`
  return `${c.hcpDesde} – ${c.hcpHasta}`
}

// ── CategorySetCard ────────────────────────────────────────────────────────

function CategorySetCard({
  set,
  onDelete,
}: {
  set:      CategorySet
  onDelete: (id: number) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [confirm,  setConfirm]  = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/ajustes/categorias/${set.id}`, { method: 'DELETE' })
    if (res.ok) {
      onDelete(set.id)
    } else {
      setDeleting(false)
      setConfirm(false)
    }
  }

  const damas      = set.categories.filter((c) => c.genero === 'DAMA')
  const caballeros = set.categories.filter((c) => c.genero === 'CABALLERO')

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">{set.nombre}</h3>
          {set.descripcion && (
            <p className="text-xs text-gray-500 mt-0.5">{set.descripcion}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link
            href={`/ajustes/categorias/${set.id}`}
            className="px-3 py-1.5 text-xs rounded-lg font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Editar
          </Link>
          {!confirm ? (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="px-3 py-1.5 text-xs rounded-lg font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Eliminar
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">¿Confirmar?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-2 py-1 text-xs rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? '…' : 'Sí'}
              </button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="px-2 py-1 text-xs rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[caballeros, damas].map((group) => {
          if (group.length === 0) return null
          const genero = group[0].genero
          return (
            <div key={genero}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                {GENDER_LABEL[genero]}
              </p>
              <div className="space-y-1.5">
                {group.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs ${GENDER_COLOR[genero]}`}
                  >
                    <span className="font-medium">{c.nombre}</span>
                    <span className="opacity-75">{hcpLabel(c)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── New set form ───────────────────────────────────────────────────────────

function NewSetForm({
  onCreated,
  onCancel,
}: {
  onCreated: (set: CategorySet) => void
  onCancel:  () => void
}) {
  const [nombre,      setNombre]      = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // categories rows state
  type Row = {
    key:      number
    genero:   Gender
    nombre:   string
    scratch:  boolean
    hcpDesde: string
    hcpHasta: string
    orden:    number
  }

  const nextKey = () => Date.now() + Math.random()

  const [rows, setRows] = useState<Row[]>([
    { key: nextKey(), genero: 'CABALLERO', nombre: 'A', scratch: false, hcpDesde: '', hcpHasta: '10', orden: 0 },
    { key: nextKey(), genero: 'CABALLERO', nombre: 'B', scratch: false, hcpDesde: '10.1', hcpHasta: '18', orden: 1 },
    { key: nextKey(), genero: 'CABALLERO', nombre: 'C', scratch: false, hcpDesde: '18.1', hcpHasta: '', orden: 2 },
    { key: nextKey(), genero: 'DAMA',      nombre: 'Damas', scratch: false, hcpDesde: '', hcpHasta: '', orden: 0 },
  ])

  function addRow(genero: Gender) {
    setRows((prev) => [
      ...prev,
      { key: nextKey(), genero, nombre: '', scratch: false, hcpDesde: '', hcpHasta: '', orden: prev.filter((r) => r.genero === genero).length },
    ])
  }

  function updateRow(key: number, field: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...field } : r)))
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const categories = rows.map((r, i) => ({
      genero:   r.genero,
      nombre:   r.nombre,
      scratch:  r.scratch,
      hcpDesde: r.hcpDesde === '' ? null : parseFloat(r.hcpDesde),
      hcpHasta: r.hcpHasta === '' ? null : parseFloat(r.hcpHasta),
      orden:    i,
    }))

    const res = await fetch('/api/ajustes/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion: descripcion || null, categories }),
    })
    setSaving(false)
    if (res.ok) {
      const set = await res.json()
      onCreated(set)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Error al crear la plantilla')
    }
  }

  const field =
    'px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  const RowEditor = ({ row }: { row: Row }) => (
    <div className="flex flex-wrap items-center gap-2 py-2 border-b border-gray-100 last:border-0">
      <select
        value={row.genero}
        onChange={(e) => updateRow(row.key, { genero: e.target.value as Gender })}
        className={`${field} w-32 text-xs`}
      >
        <option value="CABALLERO">Caballero</option>
        <option value="DAMA">Dama</option>
      </select>
      <input
        required
        value={row.nombre}
        onChange={(e) => updateRow(row.key, { nombre: e.target.value })}
        className={`${field} w-24`}
        placeholder="Nombre (A, B…)"
      />
      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={row.scratch}
          onChange={(e) => updateRow(row.key, { scratch: e.target.checked })}
          className="rounded"
        />
        Scratch
      </label>
      {!row.scratch && (
        <>
          <input
            type="number"
            step={0.1}
            value={row.hcpDesde}
            onChange={(e) => updateRow(row.key, { hcpDesde: e.target.value })}
            className={`${field} w-20`}
            placeholder="HCP desde"
          />
          <span className="text-gray-400 text-xs">–</span>
          <input
            type="number"
            step={0.1}
            value={row.hcpHasta}
            onChange={(e) => updateRow(row.key, { hcpHasta: e.target.value })}
            className={`${field} w-20`}
            placeholder="HCP hasta"
          />
        </>
      )}
      <button
        type="button"
        onClick={() => removeRow(row.key)}
        className="text-gray-300 hover:text-red-500 text-sm transition-colors"
        title="Eliminar fila"
      >
        ✕
      </button>
    </div>
  )

  return (
    <form
      onSubmit={submit}
      className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4"
    >
      <h3 className="font-semibold text-green-900 text-sm">Nueva plantilla de categorías</h3>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <label className="block text-xs text-gray-600 mb-1">Nombre *</label>
          <input
            required
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={`${field} w-full`}
            placeholder="Ej: Medal Estándar"
          />
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs text-gray-600 mb-1">Descripción</label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={`${field} w-full`}
            placeholder="Opcional"
          />
        </div>
      </div>

      {/* Categories table */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Categorías *</label>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 px-3">
          {rows.map((r) => (
            <RowEditor key={r.key} row={r} />
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => addRow('CABALLERO')}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            + Caballero
          </button>
          <button
            type="button"
            onClick={() => addRow('DAMA')}
            className="text-xs text-pink-600 hover:text-pink-800 transition-colors"
          >
            + Dama
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !nombre || rows.length === 0}
          className="px-4 py-2 text-sm rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Creando…' : 'Crear plantilla'}
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

// ── Main component ─────────────────────────────────────────────────────────

export default function CategoriasClient({ initialSets }: { initialSets: CategorySet[] }) {
  const [sets,   setSets]   = useState<CategorySet[]>(initialSets)
  const [adding, setAdding] = useState(false)

  const handleCreated = useCallback((set: CategorySet) => {
    setSets((prev) => [...prev, set].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setAdding(false)
  }, [])

  const handleDelete = useCallback((id: number) => {
    setSets((prev) => prev.filter((s) => s.id !== id))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 text-sm rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            + Nueva plantilla
          </button>
        )}
      </div>

      {adding && (
        <NewSetForm onCreated={handleCreated} onCancel={() => setAdding(false)} />
      )}

      {sets.length === 0 && !adding ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">No hay plantillas de categorías</p>
          <p className="text-xs text-gray-400 mt-1">
            Creá una plantilla para poder asignarla a tus torneos
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sets.map((s) => (
            <CategorySetCard key={s.id} set={s} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
