'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface SlotPlayer {
  id: number
  playerId: number
  carro: boolean
  reservedByUserId: number | null
  player: {
    id: number
    nombre: string
    apellido: string
    hcpIndex: number
    genero: 'DAMA' | 'CABALLERO'
  }
}

interface Slot {
  id: number
  hora: string // ISO date string
  hoyoSalida: number
  bloqueado: boolean
  players: SlotPlayer[]
}

interface Jugador {
  id: number
  matricula: string | null
  nombre: string
  apellido: string
  hcpIndex: number
  genero: 'DAMA' | 'CABALLERO'
}

interface Props {
  torneoId: number
  torneoFecha: string
  jugadoresPorLinea: number
  slots: Slot[]
  canEdit: boolean
  socioPlayerId?: number | null
  socioUserId?: number | null
}

const MAX_RESERVAS_SOCIO = 4

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function PlanillaClient({ torneoId, jugadoresPorLinea, slots: initialSlots, canEdit, socioPlayerId, socioUserId }: Props) {
  const router = useRouter()
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync with server props on refresh
  useEffect(() => { setSlots(initialSlots) }, [initialSlots])

  // ── Generar planilla ────────────────────────────────────────────────────────

  const [showGenForm, setShowGenForm] = useState(slots.length === 0)
  const [genData, setGenData] = useState({
    horaInicio: '08:00',
    intervaloMin: 8,
    cantidad: 20,
    hoyoSalida: 1,
  })

  async function handleGenerate(clearExisting = false) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/torneos/${torneoId}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...genData, clearExisting }),
      })
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 409 && !clearExisting) {
          if (confirm('Ya existe una planilla. ¿Querés reemplazarla?')) {
            await handleGenerate(true)
          }
          return
        }
        setError(data.error || 'Error al generar')
      } else {
        const newSlots = await res.json()
        setSlots(newSlots)
        setShowGenForm(false)
        router.refresh()
      }
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  async function handleClearPlanilla() {
    if (!confirm('¿Borrar toda la planilla? Esta acción no se puede deshacer.')) return
    setLoading(true)
    setError(null)
    try {
      await fetch(`/api/torneos/${torneoId}/reservas`, { method: 'DELETE' })
      setSlots([])
      setShowGenForm(true)
      router.refresh()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  // ── Toggle bloqueo ──────────────────────────────────────────────────────────

  async function toggleBloqueo(slotId: number, bloqueado: boolean) {
    try {
      const res = await fetch(`/api/torneos/${torneoId}/reservas/${slotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloqueado: !bloqueado }),
      })
      if (res.ok) {
        setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, bloqueado: !bloqueado } : s))
      }
    } catch { /* silently fail */ }
  }

  // ── Quitar jugador ──────────────────────────────────────────────────────────

  async function removePlayer(slotId: number, playerId: number) {
    try {
      const res = await fetch(
        `/api/torneos/${torneoId}/reservas/${slotId}/players?playerId=${playerId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? { ...s, players: s.players.filter((p) => p.playerId !== playerId) }
              : s
          )
        )
        router.refresh()
      }
    } catch { /* silently fail */ }
  }

  // ── Agregar jugador ─────────────────────────────────────────────────────────

  async function addPlayer(slotId: number, jugador: Jugador) {
    try {
      const res = await fetch(`/api/torneos/${torneoId}/reservas/${slotId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: jugador.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Error al agregar jugador')
        return false
      }
      const entry = await res.json()
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, players: [...s.players, entry] } : s
        )
      )
      router.refresh()
      return true
    } catch { return false }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const totalJugadores = slots.reduce((acc, s) => acc + s.players.length, 0)
  const slotsOcupados = slots.filter((s) => s.players.length > 0 && !s.bloqueado).length
  const misReservas = socioUserId
    ? slots.reduce((acc, s) => acc + s.players.filter((p) => p.reservedByUserId === socioUserId).length, 0)
    : 0
  const puedeReservar = !!socioPlayerId && misReservas < MAX_RESERVAS_SOCIO

  return (
    <div className="space-y-6">

      {/* Header + Stats */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{slots.length} turnos</span>
          <span>·</span>
          <span>{slotsOcupados} con jugadores</span>
          <span>·</span>
          <span>{totalJugadores} inscriptos</span>
        </div>
        {socioPlayerId && (
          <div className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
            misReservas >= MAX_RESERVAS_SOCIO
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            Mis reservas: {misReservas} / {MAX_RESERVAS_SOCIO}
          </div>
        )}
        {canEdit && slots.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowGenForm((v) => !v)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              {showGenForm ? 'Ocultar' : 'Modificar planilla'}
            </button>
            <button
              onClick={handleClearPlanilla}
              disabled={loading}
              className="px-3 py-1.5 text-xs border border-red-200 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Borrar planilla
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {/* Formulario de generación */}
      {canEdit && showGenForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">
            {slots.length === 0 ? 'Generar planilla' : 'Regenerar planilla'}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hora de inicio</label>
              <input
                type="time"
                value={genData.horaInicio}
                onChange={(e) => setGenData((d) => ({ ...d, horaInicio: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Intervalo (min)</label>
              <select
                value={genData.intervaloMin}
                onChange={(e) => setGenData((d) => ({ ...d, intervaloMin: Number(e.target.value) }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
              >
                {[7, 8, 9, 10, 12, 15].map((v) => (
                  <option key={v} value={v}>{v} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad de turnos</label>
              <input
                type="number"
                min={1}
                max={120}
                value={genData.cantidad}
                onChange={(e) => setGenData((d) => ({ ...d, cantidad: Number(e.target.value) }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hoyo de salida</label>
              <select
                value={genData.hoyoSalida}
                onChange={(e) => setGenData((d) => ({ ...d, hoyoSalida: Number(e.target.value) }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
              >
                <option value={1}>Hoyo 1</option>
                <option value={10}>Hoyo 10</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleGenerate(slots.length > 0)}
              disabled={loading}
              className="px-5 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg"
            >
              {loading ? 'Generando...' : slots.length === 0 ? 'Generar' : 'Regenerar'}
            </button>
            <span className="text-xs text-gray-400">
              {genData.cantidad} turnos × {jugadoresPorLinea} jugadores = {genData.cantidad * jugadoresPorLinea} plazas máx.
            </span>
          </div>
        </div>
      )}

      {/* Tabla de turnos */}
      {slots.length === 0 ? (
        !showGenForm && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">⏱️</p>
            <p>No hay turnos. Generá la planilla para comenzar.</p>
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-20">Hora</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-14 hidden sm:table-cell">Hoyo</th>
                {Array.from({ length: jugadoresPorLinea }, (_, i) => (
                  <th
                    key={i}
                    className={`text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide${i > 0 ? ' border-l border-gray-100' : ''}`}
                  >
                    Jugador {i + 1}
                  </th>
                ))}
                {canEdit && <th className="w-10 px-2 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {slots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  torneoId={torneoId}
                  jugadoresPorLinea={jugadoresPorLinea}
                  canEdit={canEdit}
                  socioPlayerId={socioPlayerId ?? null}
                  socioUserId={socioUserId ?? null}
                  puedeReservar={puedeReservar}
                  onRefresh={() => router.refresh()}
                  onToggleBloqueo={toggleBloqueo}
                  onRemovePlayer={removePlayer}
                  onAddPlayer={addPlayer}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Fila de turno ────────────────────────────────────────────────────────────

function SlotRow({
  slot,
  torneoId,
  jugadoresPorLinea,
  canEdit,
  socioPlayerId,
  socioUserId,
  puedeReservar,
  onRefresh,
  onToggleBloqueo,
  onRemovePlayer,
  onAddPlayer,
}: {
  slot: Slot
  torneoId: number
  jugadoresPorLinea: number
  canEdit: boolean
  socioPlayerId: number | null
  socioUserId: number | null
  puedeReservar: boolean
  onRefresh: () => void
  onToggleBloqueo: (slotId: number, bloqueado: boolean) => void
  onRemovePlayer: (slotId: number, playerId: number) => void
  onAddPlayer: (slotId: number, jugador: Jugador) => Promise<boolean>
}) {
  const [searchingIdx, setSearchingIdx] = useState<number | null>(null)

  const plazas: (SlotPlayer | null)[] = Array.from(
    { length: jugadoresPorLinea },
    (_, i) => slot.players[i] ?? null
  )

  return (
    <tr className={`hover:bg-gray-50/60 transition-colors ${slot.bloqueado ? 'opacity-40' : ''}`}>
      {/* Hora */}
      <td className="px-4 py-3 font-mono text-gray-700 text-xs whitespace-nowrap align-top">
        {formatHora(slot.hora)}
      </td>
      {/* Hoyo */}
      <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell align-top">
        {slot.hoyoSalida}
      </td>
      {/* Una <td> por plaza */}
      {plazas.map((sp, idx) => (
        <td
          key={idx}
          className={`px-4 py-2.5 align-middle${idx > 0 ? ' border-l border-gray-100' : ''}`}
        >
          {sp ? (
            <div className="flex items-center gap-1.5 group min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sp.player.genero === 'DAMA' ? 'bg-pink-400' : 'bg-blue-400'}`} />
              <span className={`text-sm font-medium truncate ${sp.playerId === socioPlayerId ? 'text-green-700' : 'text-gray-800'}`}>
                {sp.player.apellido}, {sp.player.nombre}
                {sp.playerId === socioPlayerId && <span className="ml-1 text-xs text-green-500">(vos)</span>}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {sp.player.hcpIndex.toFixed(1)}
              </span>
              {canEdit && !slot.bloqueado && (
                <button
                  onClick={() => onRemovePlayer(slot.id, sp.playerId)}
                  className="ml-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm leading-none flex-shrink-0"
                  title="Quitar jugador"
                >
                  ×
                </button>
              )}
              {/* SOCIO: cancelar si fue él quien reservó este lugar */}
              {!canEdit && socioUserId && sp.reservedByUserId === socioUserId && !slot.bloqueado && (
                <SocioCancelar
                  torneoId={torneoId}
                  slotId={slot.id}
                  playerId={sp.playerId}
                  onRefresh={onRefresh}
                />
              )}
            </div>
          ) : canEdit && !slot.bloqueado ? (
            searchingIdx === idx ? (
              <PlayerSearch
                torneoId={torneoId}
                slotId={slot.id}
                onAdd={onAddPlayer}
                onClose={() => setSearchingIdx(null)}
              />
            ) : (
              <button
                onClick={() => setSearchingIdx(idx)}
                className="text-xs text-gray-300 hover:text-green-600 transition-colors group/add"
              >
                <span className="border border-dashed border-gray-200 group-hover/add:border-green-300 rounded px-2 py-0.5 group-hover/add:text-green-600">
                  + Agregar
                </span>
              </button>
            )
          ) : !canEdit && socioUserId && !slot.bloqueado && puedeReservar ? (
            /* Plaza vacía — SOCIO puede reservar */
            <SocioReservar
              torneoId={torneoId}
              slotId={slot.id}
              currentPlayerCount={slot.players.length}
              onRefresh={onRefresh}
            />
          ) : (
            <span className="text-xs text-gray-200">—</span>
          )}
        </td>
      ))}
      {/* Botón bloqueo (admin) */}
      {canEdit && (
        <td className="px-2 py-3 align-top">
          <button
            onClick={() => onToggleBloqueo(slot.id, slot.bloqueado)}
            title={slot.bloqueado ? 'Desbloquear' : 'Bloquear'}
            className="text-gray-300 hover:text-orange-400 text-base transition-colors"
          >
            {slot.bloqueado ? '🔒' : '🔓'}
          </button>
        </td>
      )}
    </tr>
  )
}

// ── Botón Reservar para SOCIO (con input de matrícula) ───────────────────────

function SocioReservar({
  torneoId,
  slotId,
  currentPlayerCount,
  onRefresh,
}: {
  torneoId: number
  slotId: number
  currentPlayerCount: number
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [matricula, setMatricula] = useState('')
  const [resultado, setResultado] = useState<{ playerId: number | null; nombre: string; apellido: string; hcpIndex: number | null; genero: 'DAMA' | 'CABALLERO'; activo: boolean } | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '')
    setMatricula(val)
    setResultado(null)
    setError(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.length >= 4) {
      timerRef.current = setTimeout(() => buscarMatricula(val), 400)
    }
  }

  async function buscarMatricula(mat: string) {
    setBuscando(true)
    try {
      const res = await fetch(`/api/aag/matricula?id=${mat}`)
      if (res.ok) {
        setResultado(await res.json())
      } else {
        setError('Matrícula no encontrada')
      }
    } catch { setError('Error de conexión') }
    finally { setBuscando(false) }
  }

  async function handleConfirmar() {
    if (!resultado) return
    setGuardando(true)
    setError(null)

    let playerId = resultado.playerId
    // Si no existe en DB, lo importamos primero
    if (!playerId) {
      const cr = await fetch('/api/jugadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula,
          nombre: resultado.nombre,
          apellido: resultado.apellido,
          hcpIndex: resultado.hcpIndex ?? 36,
          genero: resultado.genero,
          tipo: 'INVITADO',
          activo: true,
        }),
      })
      if (!cr.ok) {
        const d = await cr.json()
        setError(d.error ?? 'Error al crear jugador')
        setGuardando(false)
        return
      }
      playerId = (await cr.json()).id
    }

    const res = await fetch(`/api/torneos/${torneoId}/reservas/${slotId}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, expectedCount: currentPlayerCount }),
    })
    if (res.ok) {
      onRefresh()
      setOpen(false)
      setMatricula('')
      setResultado(null)
    } else {
      const d = await res.json()
      setError(d.error ?? 'No se pudo reservar')
      if (d.stale) {
        // Refrescar tras 1.5s para que el usuario lea el mensaje y vea el estado actualizado
        setTimeout(() => {
          onRefresh()
          setOpen(false)
          setMatricula('')
          setResultado(null)
        }, 1500)
      }
    }
    setGuardando(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 rounded px-2.5 py-0.5 transition-colors"
      >
        Reservar
      </button>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={matricula}
          onChange={handleChange}
          placeholder="Matrícula..."
          className="w-28 px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
          onKeyDown={(e) => e.key === 'Escape' && (setOpen(false), setMatricula(''), setResultado(null))}
        />
        <button onClick={() => { setOpen(false); setMatricula(''); setResultado(null); setError(null) }} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>
      {buscando && <p className="text-xs text-gray-400">Buscando...</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {resultado && !buscando && (
        <div className="bg-white border border-gray-200 rounded p-2 shadow-sm w-56">
          <p className="text-xs font-semibold text-gray-900">{resultado.apellido}, {resultado.nombre}</p>
          <p className="text-xs text-gray-500">HCP {resultado.hcpIndex?.toFixed(1) ?? '—'}{!resultado.activo && ' · Inactivo'}</p>
          <button
            onClick={handleConfirmar}
            disabled={guardando || !resultado.activo}
            className="mt-1.5 w-full text-xs bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded py-1 transition-colors"
          >
            {guardando ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Botón Cancelar reserva (SOCIO) ────────────────────────────────────────────

function SocioCancelar({
  torneoId,
  slotId,
  playerId,
  onRefresh,
}: {
  torneoId: number
  slotId: number
  playerId: number
  onRefresh: () => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleCancelar() {
    if (!confirm('¿Cancelar esta reserva?')) return
    setLoading(true)
    const res = await fetch(`/api/torneos/${torneoId}/reservas/${slotId}/players?playerId=${playerId}`, {
      method: 'DELETE',
    })
    if (res.ok) onRefresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleCancelar}
      disabled={loading}
      className="ml-1 text-xs text-red-400 hover:text-red-600 disabled:opacity-50 border border-red-200 rounded px-1.5 py-0.5 transition-colors"
      title="Cancelar reserva"
    >
      {loading ? '...' : 'Cancelar'}
    </button>
  )
}

// ── Búsqueda de jugadores inline ─────────────────────────────────────────────

type AagResult = {
  playerId:  number | null
  matricula: string
  nombre:    string
  apellido:  string
  hcpIndex:  number | null
  genero:    'DAMA' | 'CABALLERO'
  club:      string | null
  activo:    boolean
}

function PlayerSearch({
  torneoId,
  slotId,
  onAdd,
  onClose,
}: {
  torneoId: number
  slotId: number
  onAdd: (slotId: number, jugador: Jugador) => Promise<boolean>
  onClose: () => void
}) {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<Jugador[]>([])
  const [aagResult, setAagResult] = useState<AagResult | null>(null)
  const [aagError, setAagError]   = useState<string | null>(null)
  const [fetching, setFetching]   = useState(false)
  const [adding, setAdding]       = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Búsqueda por nombre (DB local)
  const searchByName = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setFetching(true)
    try {
      const res = await fetch(`/api/jugadores?q=${encodeURIComponent(q)}&take=8`)
      if (res.ok) setResults(await res.json())
    } finally { setFetching(false) }
  }, [])

  // Búsqueda por matrícula (DB → AAG)
  const searchByMatricula = useCallback(async (mat: string) => {
    if (mat.length < 4) { setAagResult(null); setAagError(null); return }
    setFetching(true)
    setAagResult(null)
    setAagError(null)
    try {
      const res = await fetch(`/api/aag/matricula?id=${mat}`)
      if (res.ok) {
        setAagResult(await res.json())
      } else {
        const data = await res.json()
        setAagError(data.error ?? 'No encontrado')
      }
    } catch {
      setAagError('Error de conexión')
    } finally { setFetching(false) }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setResults([])
    setAagResult(null)
    setAagError(null)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (/^\d+$/.test(val)) {
      // Es una matrícula
      timeoutRef.current = setTimeout(() => searchByMatricula(val), 400)
    } else {
      // Es un nombre
      timeoutRef.current = setTimeout(() => searchByName(val), 250)
    }
  }

  // Agregar jugador que ya existe en DB
  async function handleSelect(jugador: Jugador) {
    setAdding(true)
    const ok = await onAdd(slotId, jugador)
    if (ok) onClose()
    else setAdding(false)
  }

  // Importar desde AAG (crear en DB) y agregar al turno
  async function handleImportAndAdd(aag: AagResult) {
    setAdding(true)
    try {
      // 1. Crear jugador en DB
      const createRes = await fetch('/api/jugadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula: aag.matricula,
          nombre:    aag.nombre,
          apellido:  aag.apellido,
          hcpIndex:  aag.hcpIndex ?? 36,
          genero:    aag.genero,
          tipo:      'INVITADO',
          activo:    true,
        }),
      })
      if (!createRes.ok) {
        const data = await createRes.json()
        alert(data.error ?? 'Error al crear jugador')
        setAdding(false)
        return
      }
      const newPlayer = await createRes.json()

      // 2. Agregar al turno
      const jugador: Jugador = {
        id:        newPlayer.id,
        matricula: newPlayer.matricula,
        nombre:    newPlayer.nombre,
        apellido:  newPlayer.apellido,
        hcpIndex:  newPlayer.hcpIndex,
        genero:    newPlayer.genero,
      }
      const ok = await onAdd(slotId, jugador)
      if (ok) onClose()
      else setAdding(false)
    } catch {
      alert('Error de conexión')
      setAdding(false)
    }
  }

  // Agregar jugador de AAG que ya existe en DB
  async function handleAddExisting(aag: AagResult) {
    if (!aag.playerId) return
    setAdding(true)
    const jugador: Jugador = {
      id:        aag.playerId,
      matricula: aag.matricula,
      nombre:    aag.nombre,
      apellido:  aag.apellido,
      hcpIndex:  aag.hcpIndex ?? 36,
      genero:    aag.genero,
    }
    const ok = await onAdd(slotId, jugador)
    if (ok) onClose()
    else setAdding(false)
  }

  const isMatricula = /^\d+$/.test(query)

  return (
    <div className="relative mt-1">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          placeholder="Apellido o matrícula..."
          className="w-48 px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
          disabled={adding}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        />
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs px-1">
          ✕
        </button>
      </div>

      {/* Resultados de búsqueda por nombre */}
      {!isMatricula && results.length > 0 && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-72 max-h-48 overflow-y-auto">
          {results.map((j) => (
            <button
              key={j.id}
              onClick={() => handleSelect(j)}
              disabled={adding}
              className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 flex items-center gap-2 disabled:opacity-50"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${j.genero === 'DAMA' ? 'bg-pink-400' : 'bg-blue-400'}`} />
              <span className="font-medium text-gray-800">{j.apellido}, {j.nombre}</span>
              {j.matricula && <span className="text-gray-400 text-xs">#{j.matricula}</span>}
              <span className="text-gray-400 ml-auto">{j.hcpIndex.toFixed(1)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Resultado de búsqueda por matrícula */}
      {isMatricula && (aagResult || aagError) && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-80">
          {aagError ? (
            <p className="px-3 py-2.5 text-xs text-red-500">{aagError}</p>
          ) : aagResult ? (
            <div className="px-3 py-2.5">
              <div className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${aagResult.genero === 'DAMA' ? 'bg-pink-400' : 'bg-blue-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">
                    {aagResult.apellido}, {aagResult.nombre}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    HCP {aagResult.hcpIndex !== null ? aagResult.hcpIndex.toFixed(1) : '—'}
                    {aagResult.club && <span className="ml-2 text-gray-400">· {aagResult.club}</span>}
                  </p>
                  {!aagResult.activo && (
                    <p className="text-xs text-orange-500 mt-0.5">⚠ Dado de baja en AAG</p>
                  )}
                  {aagResult.playerId
                    ? <p className="text-xs text-green-600 mt-0.5">✓ Ya registrado en el sistema</p>
                    : <p className="text-xs text-gray-400 mt-0.5">Se dará de alta como invitado</p>
                  }
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={() => aagResult.playerId ? handleAddExisting(aagResult) : handleImportAndAdd(aagResult)}
                    disabled={adding || !aagResult.activo}
                    className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {adding ? '...' : 'Agregar'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {fetching && (
        <p className="absolute left-0 top-full mt-1 text-xs text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">
          {isMatricula ? 'Consultando AAG...' : 'Buscando...'}
        </p>
      )}
    </div>
  )
}

