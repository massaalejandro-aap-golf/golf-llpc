'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

function hcpLabel(c: CategoryTemplate) {
  if (c.scratch) return 'Scratch'
  if (c.hcpDesde == null && c.hcpHasta == null) return 'Todos los hándicaps'
  if (c.hcpDesde == null) return `HCP ≤ ${c.hcpHasta}`
  if (c.hcpHasta == null) return `HCP ≥ ${c.hcpDesde}`
  return `HCP ${c.hcpDesde} – ${c.hcpHasta}`
}

// ── Row editor type ────────────────────────────────────────────────────────

type Row = {
  key:      number | string
  genero:   Gender
  nombre:   string
  scratch:  boolean
  hcpDesde: string
  hcpHasta: string
}

function templateToRow(t: CategoryTemplate, idx: number): Row {
  return {
    key:      t.id,
    genero:   t.genero,
    nombre:   t.nombre,
    scratch:  t.scratch,
    hcpDesde: t.hcpDesde == null ? '' : String(t.hcpDesde),
    hcpHasta: t.hcpHasta == null ? '' : String(t.hcpHasta),
  }
}

// ── Main component ─────────────────────────────────────────────────────────

export default function CategoriaSetEditor({ set }: { set: CategorySet }) {
  const router = useRouter()

  const [nombre,      setNombre]      = useState(set.nombre)
  const [descripcion, setDescripcion] = useState(set.descripcion ?? '')
  const [rows,        setRows]        = useState<Row[]>(() => set.categories.map(templateToRow))
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  let keyCounter = Date.now()
  const nextKey = () => ++keyCounter

  function addRow(genero: Gender) {
    setSaved(false)
    setRows((prev) => [
      ...prev,
      { key: nextKey(), genero, nombre: '', scratch: false, hcpDesde: '', hcpHasta: '' },
    ])
  }

  function updateRow(key: number | string, field: Partial<Row>) {
    setSaved(false)
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...field } : r)))
  }

  function removeRow(key: number | string) {
    setSaved(false)
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  function moveRow(key: number | string, dir: -1 | 1) {
    setSaved(false)
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const categories = rows.map((r, i) => ({
      genero:   r.genero,
      nombre:   r.nombre,
      scratch:  r.scratch,
      hcpDesde: r.hcpDesde === '' ? null : parseFloat(r.hcpDesde),
      hcpHasta: r.hcpHasta === '' ? null : parseFloat(r.hcpHasta),
      orden:    i,
    }))

    const res = await fetch(`/api/ajustes/categorias/${set.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        descripcion: descripcion || null,
        categories,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Error al guardar')
    }
  }

  const field =
    'px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  const GENDER_BADGE: Record<Gender, string> = {
    CABALLERO: 'bg-blue-100 text-blue-700',
    DAMA:      'bg-pink-100 text-pink-700',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Set name & description */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Datos de la plantilla</h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
            <input
              required
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setSaved(false) }}
              className={`${field} w-full`}
              placeholder="Ej: Medal Estándar"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-500 mb-1">Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => { setDescripcion(e.target.value); setSaved(false) }}
              className={`${field} w-full`}
              placeholder="Opcional"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Categorías</h2>
        <p className="text-xs text-gray-400">
          Definí las categorías por género y rango de hándicap. El orden aquí será el orden en los resultados.
        </p>

        {/* Column headers */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_1fr_1fr_auto_auto] gap-2 px-1 text-xs text-gray-400 font-medium uppercase tracking-wide">
          <span>Género</span>
          <span>Nombre</span>
          <span>Scratch</span>
          <span>HCP desde</span>
          <span>HCP hasta</span>
          <span></span>
          <span></span>
        </div>

        <div className="space-y-2">
          {rows.map((r, idx) => (
            <div
              key={r.key}
              className="flex flex-wrap sm:grid sm:grid-cols-[1fr_1fr_auto_1fr_1fr_auto_auto] gap-2 items-center py-2 border-b border-gray-50 last:border-0"
            >
              <select
                value={r.genero}
                onChange={(e) => updateRow(r.key, { genero: e.target.value as Gender })}
                className={`${field} text-xs`}
              >
                <option value="CABALLERO">Caballero</option>
                <option value="DAMA">Dama</option>
              </select>

              <input
                required
                value={r.nombre}
                onChange={(e) => updateRow(r.key, { nombre: e.target.value })}
                className={`${field}`}
                placeholder="A, B, Senior…"
              />

              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer justify-center">
                <input
                  type="checkbox"
                  checked={r.scratch}
                  onChange={(e) => updateRow(r.key, { scratch: e.target.checked })}
                  className="rounded"
                />
                <span className="sm:hidden">Scratch</span>
              </label>

              <input
                type="number"
                step={0.1}
                disabled={r.scratch}
                value={r.hcpDesde}
                onChange={(e) => updateRow(r.key, { hcpDesde: e.target.value })}
                className={`${field} disabled:bg-gray-50 disabled:text-gray-400`}
                placeholder="desde"
              />

              <input
                type="number"
                step={0.1}
                disabled={r.scratch}
                value={r.hcpHasta}
                onChange={(e) => updateRow(r.key, { hcpHasta: e.target.value })}
                className={`${field} disabled:bg-gray-50 disabled:text-gray-400`}
                placeholder="hasta"
              />

              {/* Order buttons */}
              <div className="flex gap-0.5">
                <button
                  type="button"
                  onClick={() => moveRow(r.key, -1)}
                  disabled={idx === 0}
                  className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors text-xs"
                  title="Subir"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveRow(r.key, 1)}
                  disabled={idx === rows.length - 1}
                  className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors text-xs"
                  title="Bajar"
                >
                  ▼
                </button>
              </div>

              <button
                type="button"
                onClick={() => removeRow(r.key)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Eliminar categoría"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}

          {rows.length === 0 && (
            <p className="text-xs text-gray-400 py-2">
              No hay categorías. Agregá al menos una.
            </p>
          )}
        </div>

        {/* Add row buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => addRow('CABALLERO')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            + Categoría Caballero
          </button>
          <button
            type="button"
            onClick={() => addRow('DAMA')}
            className="text-xs text-pink-600 hover:text-pink-800 font-medium transition-colors"
          >
            + Categoría Dama
          </button>
        </div>
      </div>

      {/* Save */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !nombre || rows.length === 0}
          className="px-5 py-2 text-sm rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
