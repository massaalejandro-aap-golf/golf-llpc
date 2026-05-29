'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Cancha = { id: number; nombre: string }

type Tee = {
  id:     number
  nombre: string
  color:  string
  slope:  number | null
  rating: number | null
}

type CategoryTemplate = {
  id:       number
  genero:   'DAMA' | 'CABALLERO'
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
  categories:  CategoryTemplate[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPOS = [
  { value: 'MEDAL',               label: 'Medal' },
  { value: 'STABLEFORD',          label: 'Stableford' },
  { value: 'MATCH_PLAY',          label: 'Match Play' },
  { value: 'CHOICE_ECLECTIC',     label: 'Choice / Eclectic' },
  { value: 'RANKING',             label: 'Ranking' },
  { value: 'GOLFER',              label: 'Golfer' },
  { value: 'FOURBALL_AMERICANO',  label: 'Fourball Americano' },
  { value: 'FOURBALL_CLASICO',    label: 'Fourball Clásico' },
  { value: 'FOURBALL_AGGREGATE',  label: 'Fourball Aggregate' },
  { value: 'LAGUNEADA',           label: 'Laguneada' },
  { value: 'FOURSOME',            label: 'Foursome' },
  { value: 'SCRAMBLE',            label: 'Scramble' },
  { value: 'PELOTERO',            label: 'Pelotero' },
]

function hcpLabel(c: Pick<CategoryTemplate, 'scratch' | 'hcpDesde' | 'hcpHasta'>) {
  if (c.scratch) return 'Scratch'
  if (c.hcpDesde == null && c.hcpHasta == null) return 'Todos los HCP'
  if (c.hcpDesde == null) return `HCP ≤ ${c.hcpHasta}`
  if (c.hcpHasta == null) return `HCP ≥ ${c.hcpDesde}`
  return `HCP ${c.hcpDesde}–${c.hcpHasta}`
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function NuevoTorneoForm({
  canchas,
  categorySets,
}: {
  canchas: Cancha[]
  categorySets: CategorySet[]
}) {
  const router = useRouter()
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Datos básicos (controlled para auto-sync)
  const [nombre, setNombre]                 = useState('')
  const [nombrePlanilla, setNombrePlanilla] = useState('')
  const [reservasHabilitadas, setReservasHabilitadas] = useState(true)

  // Cancha y tees
  const [courseIdSelected, setCourseIdSelected] = useState<number | null>(null)
  const [tees, setTees]           = useState<Tee[]>([])
  const [loadingTees, setLoadingTees] = useState(false)
  const [teeHombreId, setTeeHombreId] = useState<number | null>(null)
  const [teeDamaId, setTeeDamaId]     = useState<number | null>(null)

  // Categorías
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null)
  const selectedSet = categorySets.find((s) => s.id === selectedSetId) ?? null

  // Scratch
  const [scratchCab, setScratchCab] = useState(false)
  const [scratchDam, setScratchDam] = useState(false)

  // Auto-completar nombrePlanilla con el nombre del torneo si está vacío
  useEffect(() => {
    setNombrePlanilla((prev) => (prev === '' || prev === nombre.slice(0, -1)) ? nombre : prev)
  }, [nombre])

  // Fetch tees cuando cambia la cancha
  useEffect(() => {
    if (!courseIdSelected) {
      setTees([])
      setTeeHombreId(null)
      setTeeDamaId(null)
      return
    }
    setLoadingTees(true)
    setTeeHombreId(null)
    setTeeDamaId(null)
    fetch(`/api/ajustes/canchas/${courseIdSelected}/tees`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: Tee[]) => {
        setTees(data)
        // Auto-seleccionar por color: Blanco → caballeros, Rojo → damas
        const blanco = data.find((t) => /blanco/i.test(t.color ?? '') || /blanco/i.test(t.nombre))
        const rojo   = data.find((t) => /rojo/i.test(t.color ?? '')   || /rojo/i.test(t.nombre))
        setTeeHombreId(blanco?.id ?? null)
        setTeeDamaId(rojo?.id ?? null)
      })
      .catch(() => setTees([]))
      .finally(() => setLoadingTees(false))
  }, [courseIdSelected])

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!courseIdSelected) { setError('Seleccioná una cancha'); return }
    if (!selectedSet) { setError('Seleccioná una plantilla de categorías'); return }

    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const body = {
      nombre,
      nombrePlanilla: nombrePlanilla || null,
      fecha:             fd.get('fecha'),
      tipo:              fd.get('tipo'),
      hoyos:             fd.get('hoyos'),
      ronda:             fd.get('ronda'),
      jugadoresPorLinea: Number(fd.get('jugadoresPorLinea')),
      scoreMaxMedal:     fd.get('scoreMaxMedal') === 'on',
      aagEnabled:        fd.get('aagEnabled') === 'on',
      reservasHabilitadas,
      courseId:          courseIdSelected,
      teeHombreId:       teeHombreId ?? null,
      teeDamaId:         teeDamaId  ?? null,
      categorySetId:     selectedSetId,
      categorias: [
        ...selectedSet.categories.map((c) => ({
          genero:   c.genero,
          nombre:   c.nombre,
          scratch:  c.scratch,
          hcpDesde: c.hcpDesde ?? null,
          hcpHasta: c.hcpHasta ?? null,
        })),
        ...(scratchCab ? [{ genero: 'CABALLERO' as const, nombre: 'Scratch', scratch: true, hcpDesde: null, hcpHasta: null }] : []),
        ...(scratchDam ? [{ genero: 'DAMA'      as const, nombre: 'Scratch', scratch: true, hcpDesde: null, hcpHasta: null }] : []),
      ],
    }

    const res = await fetch('/api/torneos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)
    if (!res.ok) {
      try {
        const data = await res.json()
        setError(data.error || `Error al crear el torneo (${res.status})`)
      } catch {
        setError(`Error al crear el torneo (${res.status})`)
      }
    } else {
      const data = await res.json()
      router.push(`/torneos/${data.id}`)
    }
  }

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
  const lbl   = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">

      {/* ── Datos básicos ── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">Datos del torneo</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Nombre del torneo *</label>
            <input
              name="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={field}
              placeholder="ej. Medal de sábado"
            />
          </div>

          {reservasHabilitadas && (
            <div className="col-span-2">
              <label className={lbl}>
                Nombre de la planilla de reservas
                <span className="ml-1 text-gray-400 font-normal text-xs">(aparece en el menú Reservas)</span>
              </label>
              <input
                name="nombrePlanilla"
                value={nombrePlanilla}
                onChange={(e) => setNombrePlanilla(e.target.value)}
                className={field}
                placeholder="ej. Medal de sábado"
              />
            </div>
          )}

          <div>
            <label className={lbl}>Fecha *</label>
            <input name="fecha" type="date" required className={field} />
          </div>

          <div>
            <label className={lbl}>Cancha *</label>
            <select
              value={courseIdSelected ?? ''}
              onChange={(e) => setCourseIdSelected(e.target.value ? Number(e.target.value) : null)}
              required
              className={field}
            >
              <option value="">Seleccionar...</option>
              {canchas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tees de salida */}
        {courseIdSelected && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>
                Tee de salida — Caballeros
                {loadingTees && <span className="ml-1 text-xs text-gray-400">cargando...</span>}
              </label>
              <select
                value={teeHombreId ?? ''}
                onChange={(e) => setTeeHombreId(e.target.value ? Number(e.target.value) : null)}
                className={field}
                disabled={loadingTees || tees.length === 0}
              >
                <option value="">Sin especificar</option>
                {tees.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}{t.slope ? ` (Slope ${t.slope})` : ''}
                  </option>
                ))}
              </select>
              {!loadingTees && tees.length === 0 && courseIdSelected && (
                <p className="text-xs text-gray-400 mt-1">Esta cancha no tiene tees configurados</p>
              )}
            </div>
            <div>
              <label className={lbl}>Tee de salida — Damas</label>
              <select
                value={teeDamaId ?? ''}
                onChange={(e) => setTeeDamaId(e.target.value ? Number(e.target.value) : null)}
                className={field}
                disabled={loadingTees || tees.length === 0}
              >
                <option value="">Sin especificar</option>
                {tees.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}{t.slope ? ` (Slope ${t.slope})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* ── Configuración ── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">Configuración</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Tipo de torneo</label>
            <select name="tipo" defaultValue="MEDAL" className={field}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Hoyos</label>
            <select name="hoyos" defaultValue="EIGHTEEN" className={field}>
              <option value="EIGHTEEN">18 hoyos</option>
              <option value="NINE">9 hoyos</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Ronda</label>
            <input name="ronda" defaultValue="Única" className={field} />
          </div>
          <div>
            <label className={lbl}>Jugadores por línea</label>
            <select name="jugadoresPorLinea" defaultValue="4" className={field}>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input name="aagEnabled" type="checkbox" defaultChecked className="rounded" />
            Enviar tarjetas a la AAG
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input name="scoreMaxMedal" type="checkbox" className="rounded" />
            Tope de score máximo
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={reservasHabilitadas}
              onChange={(e) => setReservasHabilitadas(e.target.checked)}
              className="rounded"
            />
            Habilitar reservas
          </label>
        </div>
      </section>

      {/* ── Categorías ── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">Categorías</h2>

        <div>
          <label className={lbl}>Plantilla de categorías *</label>
          {categorySets.length === 0 ? (
            <p className="text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
              No hay plantillas de categorías configuradas.{' '}
              <a href="/ajustes/categorias" className="underline">Crear una en Ajustes</a>.
            </p>
          ) : (
            <select
              value={selectedSetId ?? ''}
              onChange={(e) => setSelectedSetId(e.target.value ? Number(e.target.value) : null)}
              className={field}
            >
              <option value="">Seleccionar plantilla...</option>
              {categorySets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}{s.descripcion ? ` — ${s.descripcion}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Vista previa de las categorías */}
        {selectedSet && <CategorySetPreview categories={selectedSet.categories} />}

        {/* Scratch */}
        {selectedSet && (
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={scratchCab}
                onChange={(e) => setScratchCab(e.target.checked)}
                className="rounded"
              />
              Scratch Caballeros
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={scratchDam}
                onChange={(e) => setScratchDam(e.target.checked)}
                className="rounded"
              />
              Scratch Damas
            </label>
          </div>
        )}
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
        >
          {loading ? 'Guardando...' : 'Crear torneo'}
        </button>
      </div>
    </form>
  )
}

// ── Vista previa de categorías ─────────────────────────────────────────────────

function CategorySetPreview({
  categories,
}: {
  categories: Pick<CategoryTemplate, 'genero' | 'nombre' | 'scratch' | 'hcpDesde' | 'hcpHasta'>[]
}) {
  const caballeros = categories.filter((c) => c.genero === 'CABALLERO')
  const damas      = categories.filter((c) => c.genero === 'DAMA')

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
      {caballeros.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">Caballeros</p>
          <ul className="space-y-1">
            {caballeros.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {c.scratch && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Scratch</span>
                  )}
                  <span className="font-medium text-gray-800">{c.nombre}</span>
                </div>
                <span className="text-xs text-gray-400">{hcpLabel(c)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {damas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide mb-1.5">Damas</p>
          <ul className="space-y-1">
            {damas.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {c.scratch && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-medium">Scratch</span>
                  )}
                  <span className="font-medium text-gray-800">{c.nombre}</span>
                </div>
                <span className="text-xs text-gray-400">{hcpLabel(c)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
