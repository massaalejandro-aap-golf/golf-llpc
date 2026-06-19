'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Player = { id: number; nombre: string; apellido: string; hcpIndex: number }
type SlotPlayer = {
  id: number; playerId: number; posicion: number | null; carro: boolean
  reservedByUserId: number | null; player: Player
}
type Slot = {
  id: number; hora: string; hoyoSalida: number; bloqueado: boolean; players: SlotPlayer[]
}
type Torneo = {
  id: number; nombre: string; fecha: string; jugadoresPorLinea: number
  reservasHabilitadas: boolean; status: string; teeTimeSlots: Slot[]
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

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
  const [loading, setLoading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Encontrar si el jugador del usuario ya tiene una reserva
  const miReserva = sessionPlayerId
    ? torneo.teeTimeSlots.flatMap((s) => s.players).find((p) => p.playerId === sessionPlayerId)
    : null

  const miSlotId = miReserva
    ? torneo.teeTimeSlots.find((s) => s.players.some((p) => p.playerId === sessionPlayerId))?.id
    : null

  async function reservar(slotId: number, currentCount: number) {
    if (!sessionPlayerId) { setError('Tu usuario no tiene jugador asociado'); return }
    setLoading(slotId)
    setError(null)
    try {
      const res = await fetch(`/api/torneos/${torneo.id}/reservas/${slotId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: sessionPlayerId, expectedCount: currentCount }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al reservar'); return }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function cancelar(slotId: number) {
    if (!sessionPlayerId) return
    setLoading(slotId)
    setError(null)
    try {
      const res = await fetch(
        `/api/torneos/${torneo.id}/reservas/${slotId}/players?playerId=${sessionPlayerId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error al cancelar'); return }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  if (!torneo.reservasHabilitadas) {
    return (
      <div className="text-center text-gray-500 py-16 px-6">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-semibold">Las reservas no están habilitadas para este torneo.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {miReserva && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          ✅ Tenés reserva en el turno de las{' '}
          <strong>{fmtHora(torneo.teeTimeSlots.find((s) => s.id === miSlotId)!.hora)}</strong>
        </div>
      )}

      {torneo.teeTimeSlots.map((slot) => {
        const libre = !slot.bloqueado && slot.players.length < torneo.jugadoresPorLinea
        const esMiSlot = slot.id === miSlotId
        const isLoading = loading === slot.id

        return (
          <div
            key={slot.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
              esMiSlot ? 'border-green-300' : 'border-gray-100'
            }`}
          >
            {/* Hora */}
            <div className={`px-4 py-3 flex items-center justify-between ${esMiSlot ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div>
                <span className="font-bold text-gray-900">{fmtHora(slot.hora)}</span>
                {slot.hoyoSalida !== 1 && (
                  <span className="ml-2 text-xs text-gray-500">Hoyo {slot.hoyoSalida}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {slot.bloqueado ? (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Bloqueado</span>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    libre ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {slot.players.length}/{torneo.jugadoresPorLinea}
                  </span>
                )}
              </div>
            </div>

            {/* Jugadores */}
            {slot.players.length > 0 && (
              <div className="px-4 py-2 space-y-1 border-t border-gray-50">
                {slot.players.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 text-xs w-4 text-center">{sp.posicion ?? '·'}</span>
                    <span className={`flex-1 ${sp.playerId === sessionPlayerId ? 'font-semibold text-green-700' : 'text-gray-700'}`}>
                      {sp.player.apellido}, {sp.player.nombre}
                    </span>
                    <span className="text-gray-400 text-xs">HCP {sp.player.hcpIndex.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Acción */}
            {!slot.bloqueado && (
              <div className="px-4 py-3 border-t border-gray-50">
                {esMiSlot ? (
                  <button
                    onClick={() => cancelar(slot.id)}
                    disabled={isLoading}
                    className="w-full py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    {isLoading ? 'Cancelando...' : 'Cancelar mi reserva'}
                  </button>
                ) : libre && !miReserva ? (
                  <button
                    onClick={() => reservar(slot.id, slot.players.length)}
                    disabled={isLoading}
                    className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    {isLoading ? 'Reservando...' : 'Reservar este turno'}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
