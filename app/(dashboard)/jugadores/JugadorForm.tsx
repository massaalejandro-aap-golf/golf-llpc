'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { MatriculaResult as AAGPlayer } from '@/app/api/aag/matricula/route'

interface JugadorData {
  matricula:   string
  nombre:      string
  apellido:    string
  genero:      'DAMA' | 'CABALLERO'
  hcpIndex:    number
  tipo:        'SOCIO' | 'INVITADO' | 'SOCIO_TEMPORARIO' | 'INVITADO_TEMPORARIO'
  email:       string
  telefono:    string
  dni:         string
  fechaNac:    string   // 'YYYY-MM-DD' o vacío
  categoria:   string
  centroCosto: string
  activo:      boolean
}

interface Props {
  mode:                'create' | 'edit'
  jugadorId?:          number
  initial?:            Partial<JugadorData>
  /** Matrícula pre-cargada (ej. desde URL ?matricula=88730): dispara lookup AAG automático */
  autoFetchMatricula?: string
}

const EMPTY: JugadorData = {
  matricula: '', nombre: '', apellido: '', genero: 'CABALLERO', hcpIndex: 0,
  tipo: 'SOCIO', email: '', telefono: '',
  dni: '', fechaNac: '', categoria: '', centroCosto: '', activo: true,
}

const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'

export default function JugadorForm({ mode, jugadorId, initial = {}, autoFetchMatricula }: Props) {
  const router = useRouter()
  const [data, setData]       = useState<JugadorData>({
    ...EMPTY,
    ...initial,
    ...(autoFetchMatricula ? { matricula: autoFetchMatricula } : {}),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // AAG lookup state
  const [aagLoading, setAagLoading] = useState(false)
  // Si ya vienen datos pre-cargados desde la búsqueda, marcar como hecho
  const preloaded = !autoFetchMatricula && !!(initial?.nombre && initial?.apellido)
  const [aagMsg, setAagMsg] = useState<{ ok: boolean; text: string } | null>(
    preloaded
      ? { ok: true, text: `✓ ${initial!.apellido}, ${initial!.nombre}${initial!.hcpIndex != null ? ` — HCP ${Number(initial!.hcpIndex).toFixed(1)}` : ''}` }
      : null
  )
  const [aagDone, setAagDone] = useState(preloaded)

  // Auto-disparar lookup si se abrió desde "Crear ficha" sin datos pre-cargados
  useEffect(() => {
    if (autoFetchMatricula && mode === 'create') {
      buscarEnAAG(autoFetchMatricula)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set<K extends keyof JugadorData>(key: K, val: JugadorData[K]) {
    setData((d) => ({ ...d, [key]: val }))
    if (key === 'matricula') { setAagMsg(null); setAagDone(false) }
  }

  // ─── Consultar AAG ─────────────────────────────────────────────────────────
  async function buscarEnAAG(overrideMatricula?: string) {
    const mat = (overrideMatricula ?? data.matricula).trim()
    if (!mat) {
      setAagMsg({ ok: false, text: 'Ingresá la matrícula primero' })
      return
    }
    setAagLoading(true)
    setAagMsg(null)
    setAagDone(false)

    try {
      const res  = await fetch(`/api/aag/matricula?id=${encodeURIComponent(mat)}`)
      const json = await res.json()

      if (!res.ok) {
        setAagMsg({ ok: false, text: json.error ?? 'Error al consultar AAG' })
        return
      }

      const p = json as AAGPlayer

      setData((d) => ({
        ...d,
        nombre:   p.nombre   || d.nombre,
        apellido: p.apellido || d.apellido,
        hcpIndex: p.hcpIndex ?? d.hcpIndex,
        genero:   p.genero   ?? d.genero,
        dni:      p.dni      ?? d.dni,
        fechaNac: p.fechaNac ? p.fechaNac.split('T')[0] : d.fechaNac,
      }))

      setAagDone(true)
      setAagMsg({
        ok:   true,
        text: `✓ ${p.apellido}, ${p.nombre} — HCP ${p.hcpIndex?.toFixed(1) ?? '—'}`,
      })
    } catch {
      setAagMsg({ ok: false, text: 'Error de red al consultar AAG' })
    } finally {
      setAagLoading(false)
    }
  }

  // ─── Guardar ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const body = {
      ...data,
      hcpIndex:    Number(data.hcpIndex),
      matricula:   data.matricula   || null,
      email:       data.email       || null,
      telefono:    data.telefono    || null,
      dni:         data.dni         || null,
      fechaNac:    data.fechaNac    || null,
      categoria:   data.categoria   || null,
      centroCosto: data.centroCosto || null,
    }

    const url    = mode === 'create' ? '/api/jugadores' : `/api/jugadores/${jugadorId}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    setLoading(false)

    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Error al guardar')
    } else {
      const d = await res.json()
      router.push(`/jugadores/${d.id}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">

      {/* ── 1. Matrícula — identificador único del golfista ────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-gray-800 border-b pb-2">Matrícula AAG</h2>
          <p className="text-xs text-gray-400 mt-1.5">
            Es el identificador único del golfista en el padrón nacional — como su DNI dentro del golf.
            Ingresalo y consultá AAG para completar nombre, HCP y datos personales automáticamente.
          </p>
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1 max-w-xs">
            <label className={label}>
              Nº de matrícula <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={data.matricula}
              onChange={(e) => set('matricula', e.target.value)}
              className={`${field} font-mono text-base tracking-wider`}
              placeholder="ej. 88730"
              inputMode="numeric"
              autoFocus={mode === 'create' && !autoFetchMatricula}
            />
          </div>

          <button
            type="button"
            onClick={() => buscarEnAAG()}
            disabled={aagLoading || !data.matricula.trim()}
            title="Buscar en el padrón AAG y completar datos automáticamente"
            className={`
              shrink-0 px-4 py-2 text-sm font-medium rounded-lg border transition-colors
              ${aagDone
                ? 'border-green-500 bg-green-600 text-white'
                : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'}
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            {aagLoading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Consultando…
              </span>
            ) : aagDone ? (
              '✓ Datos cargados'
            ) : (
              'Consultar AAG'
            )}
          </button>
        </div>

        {aagMsg && (
          <p className={`text-xs px-3 py-2 rounded-lg border ${
            aagMsg.ok
              ? 'text-green-700 bg-green-50 border-green-200'
              : 'text-red-600 bg-red-50 border-red-200'
          }`}>
            {aagMsg.text}
          </p>
        )}
      </section>

      {/* ── 2. Datos personales ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">Datos personales</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Apellido <span className="text-red-500">*</span></label>
            <input
              required
              value={data.apellido}
              onChange={(e) => set('apellido', e.target.value)}
              className={field}
              placeholder="García"
            />
          </div>
          <div>
            <label className={label}>Nombre <span className="text-red-500">*</span></label>
            <input
              required
              value={data.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              className={field}
              placeholder="Juan"
            />
          </div>
          <div>
            <label className={label}>Género <span className="text-red-500">*</span></label>
            <select
              value={data.genero}
              onChange={(e) => set('genero', e.target.value as 'DAMA' | 'CABALLERO')}
              className={field}
            >
              <option value="CABALLERO">Caballero</option>
              <option value="DAMA">Dama</option>
            </select>
          </div>
          <div>
            <label className={label}>HCP Index <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={0}
              max={54}
              step={0.1}
              required
              value={data.hcpIndex}
              onChange={(e) => set('hcpIndex', Number(e.target.value))}
              className={field}
            />
          </div>
        </div>
      </section>

      {/* ── 3. Clasificación en el club ───────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">Clasificación en el club</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Tipo <span className="text-red-500">*</span></label>
            <select
              value={data.tipo}
              onChange={(e) => set('tipo', e.target.value as JugadorData['tipo'])}
              className={field}
            >
              <option value="SOCIO">Socio</option>
              <option value="INVITADO">Invitado</option>
              <option value="SOCIO_TEMPORARIO">Socio temporario</option>
              <option value="INVITADO_TEMPORARIO">Invitado temporario</option>
            </select>
          </div>
          <div>
            <label className={label}>Categoría de socio</label>
            <input
              value={data.categoria}
              onChange={(e) => set('categoria', e.target.value)}
              className={field}
              placeholder="A, B, C, Senior…"
            />
          </div>
          <div>
            <label className={label}>Centro de costo</label>
            <input
              value={data.centroCosto}
              onChange={(e) => set('centroCosto', e.target.value)}
              className={field}
            />
          </div>
          {mode === 'edit' && (
            <div className="flex items-center gap-2 pt-6">
              <input
                id="activo"
                type="checkbox"
                checked={data.activo}
                onChange={(e) => set('activo', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="activo" className="text-sm text-gray-700 cursor-pointer">
                Jugador activo
              </label>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Contacto y datos adicionales ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">Contacto y datos adicionales</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Email</label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => set('email', e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className={label}>Teléfono</label>
            <input
              value={data.telefono}
              onChange={(e) => set('telefono', e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className={label}>DNI</label>
            <input
              value={data.dni}
              onChange={(e) => set('dni', e.target.value)}
              className={field}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className={label}>Fecha de nacimiento</label>
            <input
              type="date"
              value={data.fechaNac}
              onChange={(e) => set('fechaNac', e.target.value)}
              className={field}
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg"
        >
          {loading ? 'Guardando…' : mode === 'create' ? 'Crear jugador' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
