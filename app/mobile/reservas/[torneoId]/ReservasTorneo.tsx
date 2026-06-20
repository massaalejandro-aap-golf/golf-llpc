'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Player = { id: number; nombre: string; apellido: string; hcpIndex: number; matricula: string | null }
type SlotPlayer = { id: number; playerId: number; posicion: number | null; reservedByUserId: number | null; player: Player }
type Slot = { id: number; hora: string; hoyoSalida: number; bloqueado: boolean; players: SlotPlayer[] }
type Torneo = { id: number; nombre: string; jugadoresPorLinea: number; reservasHabilitadas: boolean; status: string; teeTimeSlots: Slot[] }

type JugadorBuscado = { id: number; nombre: string; apellido: string; matricula: string | null; hcpIndex: number } | null
type BusquedaState = { loading: boolean; error: string | null; jugador: JugadorBuscado }

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

// ── Fila de búsqueda de matrícula ─────────────────────────────────────────────
function MatriculaInput({
  index,
  state,
  onChange,
  onBuscar,
  onLimpiar,
}: {
  index: number
  state: BusquedaState
  onChange: (mat: string) => void
  onBuscar: () => void
  onLimpiar: () => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-500">Jugador {index + 1}</label>
      {state.jugador ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <span className="flex-1 text-sm font-medium text-green-800">
            {state.jugador.apellido}, {state.jugador.nombre}
          </span>
          <button onClick={onLimpiar} className="text-green-600 text-lg leading-none">✕</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Matrícula..."
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onBuscar()}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={onBuscar}
            disabled={state.loading}
            className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            {state.loading ? '…' : 'OK'}
          </button>
        </div>
      )}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  )
}

// ── Modal de reserva ──────────────────────────────────────────────────────────
function ReservaModal({
  slot,
  torneoId,
  disponibles,
  onClose,
  onDone,
}: {
  slot: Slot
  torneoId: number
  disponibles: number
  onClose: () => void
  onDone: () => void
}) {
  const maxNuevos = Math.min(disponibles, 4)
  const emptySearch: BusquedaState = { loading: false, error: null, jugador: null }

  const [matriculas, setMatriculas] = useState<string[]>(Array(maxNuevos).fill(''))
  const [busquedas, setBusquedas]   = useState<BusquedaState[]>(Array(maxNuevos).fill(null).map(() => ({ ...emptySearch })))
  const [saving, setSaving]         = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  function updateMatricula(i: number, val: string) {
    const m = [...matriculas]; m[i] = val; setMatriculas(m)
    const b = [...busquedas]; b[i] = { ...emptySearch }; setBusquedas(b)
  }

  async function buscar(i: number) {
    const mat = matriculas[i]?.trim()
    if (!mat) return
    const b = [...busquedas]; b[i] = { loading: true, error: null, jugador: null }; setBusquedas(b)
    try {
      const res = await fetch(`/api/mobile/jugador?matricula=${encodeURIComponent(mat)}`)
      const data = await res.json()
      const nb = [...busquedas]
      if (!res.ok) { nb[i] = { loading: false, error: data.error ?? 'No encontrado', jugador: null } }
      else         { nb[i] = { loading: false, error: null, jugador: data } }
      setBusquedas(nb)
    } catch {
      const nb = [...busquedas]; nb[i] = { loading: false, error: 'Error de red', jugador: null }; setBusquedas(nb)
    }
  }

  function limpiar(i: number) {
    const m = [...matriculas]; m[i] = ''; setMatriculas(m)
    const b = [...busquedas]; b[i] = { ...emptySearch }; setBusquedas(b)
  }

  async function confirmar() {
    const jugadoresAagregar = busquedas.map((b) => b.jugador).filter(Boolean)
    if (jugadoresAagregar.length === 0) { setGlobalError('Buscá al menos un jugador antes de confirmar.'); return }
    setSaving(true); setGlobalError(null)
    try {
      for (const jugador of jugadoresAagregar) {
        const res = await fetch(`/api/torneos/${torneoId}/reservas/${slot.id}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: jugador!.id }),
        })
        if (!res.ok) {
          const d = await res.json()
          setGlobalError(`${jugador!.apellido}: ${d.error ?? 'Error'}`)
          setSaving(false); return
        }
      }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Reservar {fmtHora(slot.hora)}</h3>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">✕</button>
        </div>

        <p className="text-sm text-gray-500">{disponibles} lugar{disponibles !== 1 ? 'es' : ''} disponible{disponibles !== 1 ? 's' : ''} — ingresá la matrícula de cada jugador</p>

        {Array.from({ length: maxNuevos }).map((_, i) => (
          <MatriculaInput
            key={i}
            index={i}
            state={busquedas[i]}
            onChange={(v) => updateMatricula(i, v)}
            onBuscar={() => buscar(i)}
            onLimpiar={() => limpiar(i)}
          />
        ))}

        {globalError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{globalError}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold">Cancelar</button>
          <button
            onClick={confirmar}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-green-600 text-white font-semibold disabled:opacity-40"
          >
            {saving ? 'Reservando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ReservasTorneo({
  torneo,
  sessionUserId,
  sessionPlayerId,
}: {
  torneo: Torneo
  sessionUserId: number
  sessionPlayerId: number | null
}) {
  const router = useRouter()
  const [modalSlot, setModalSlot] = useState<Slot | null>(null)
  const [cancelando, setCancelando] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Encontrar reserva propia
  const miSlot = torneo.teeTimeSlots.find((s) => s.players.some((p) => p.playerId === sessionPlayerId))

  async function cancelar(slot: Slot) {
    if (!sessionPlayerId) return
    setCancelando(slot.id); setError(null)
    try {
      const res = await fetch(`/api/torneos/${torneo.id}/reservas/${slot.id}/players?playerId=${sessionPlayerId}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
      router.refresh()
    } finally { setCancelando(null) }
  }

  if (!torneo.reservasHabilitadas) {
    return <div className="text-center text-gray-500 py-16 px-6"><p className="text-4xl mb-3">🔒</p><p className="font-semibold">Las reservas no están habilitadas.</p></div>
  }

  return (
    <div className="px-3 py-4">
      {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {miSlot && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-center justify-between">
          <span>✅ Reserva confirmada · <strong>{fmtHora(miSlot.hora)}</strong></span>
          <button
            onClick={() => cancelar(miSlot)}
            disabled={cancelando === miSlot.id}
            className="text-xs text-red-600 font-semibold ml-2"
          >
            {cancelando === miSlot.id ? '…' : 'Cancelar'}
          </button>
        </div>
      )}

      {/* Tabla de slots */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[90px_1fr] bg-teal-600 text-white text-sm font-bold">
          <div className="px-3 py-2 text-center">Línea</div>
          <div className="px-3 py-2 border-l border-teal-500">Jugadores</div>
        </div>

        {/* Slots */}
        {torneo.teeTimeSlots.map((slot, idx) => {
          const totalSpots = torneo.jugadoresPorLinea
          const ocupados = slot.players.length
          const disponibles = totalSpots - ocupados
          const esMiSlot = slot.id === miSlot?.id
          const lineaNum = idx + 1
          const spots = Array.from({ length: totalSpots }, (_, i) => slot.players[i] ?? null)

          return (
            <div
              key={slot.id}
              className={`grid grid-cols-[90px_1fr] border-t border-gray-100 ${esMiSlot ? 'bg-green-50' : ''}`}
            >
              {/* Columna izquierda */}
              <div className="px-2 py-3 flex flex-col items-center justify-center gap-1.5 border-r border-gray-100">
                <span className="text-xs font-bold text-gray-700">L{lineaNum} H{slot.hoyoSalida}</span>
                <span className="text-xs text-gray-400">{fmtHora(slot.hora)}</span>
                {slot.bloqueado ? (
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-1">Bloq.</span>
                ) : disponibles > 0 && !miSlot ? (
                  <button
                    onClick={() => setModalSlot(slot)}
                    className="text-xs font-bold text-white bg-green-700 rounded px-2 py-1 active:scale-95 transition-transform"
                  >
                    RESERVAR
                  </button>
                ) : esMiSlot ? (
                  <span className="text-xs text-green-700 font-bold">✓ MI TURNO</span>
                ) : (
                  <span className="text-xs text-gray-300">LLENO</span>
                )}
              </div>

              {/* Columna jugadores */}
              <div className="py-1">
                {spots.map((sp, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-1.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                    <span className="text-gray-300 text-xs w-4">{i + 1}.</span>
                    {sp ? (
                      <span className={`text-sm font-medium ${sp.playerId === sessionPlayerId ? 'text-green-700 font-bold' : 'text-gray-800'}`}>
                        {sp.player.apellido}, {sp.player.nombre}
                        {sp.player.matricula && <span className="text-gray-400 text-xs ml-1">({sp.player.matricula})</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 uppercase tracking-wide">⛳ Lugar libre</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modalSlot && (
        <ReservaModal
          slot={modalSlot}
          torneoId={torneo.id}
          disponibles={torneo.jugadoresPorLinea - modalSlot.players.length}
          onClose={() => setModalSlot(null)}
          onDone={() => { setModalSlot(null); router.refresh() }}
        />
      )}
    </div>
  )
}
