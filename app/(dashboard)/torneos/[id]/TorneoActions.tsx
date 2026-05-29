'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type TournamentStatus =
  | 'ACTIVO'
  | 'EN_JUEGO'
  | 'FINALIZADO'
  | 'PROCESADO'
  | 'POSPUESTO'
  | 'SUSPENDIDO'
  | 'CANCELADO'

interface Props {
  torneoId: number
  status: TournamentStatus
  canEdit: boolean
  isAdmin: boolean
}

const NEXT_STATUS: Partial<Record<TournamentStatus, { status: TournamentStatus; label: string; color: string }>> = {
  ACTIVO:     { status: 'EN_JUEGO',   label: 'Iniciar torneo',   color: 'bg-blue-600 hover:bg-blue-700' },
  EN_JUEGO:   { status: 'FINALIZADO', label: 'Finalizar torneo', color: 'bg-gray-600 hover:bg-gray-700' },
  FINALIZADO: { status: 'PROCESADO',  label: 'Marcar procesado', color: 'bg-purple-600 hover:bg-purple-700' },
  POSPUESTO:  { status: 'ACTIVO',     label: 'Reactivar',        color: 'bg-green-600 hover:bg-green-700' },
  SUSPENDIDO: { status: 'ACTIVO',     label: 'Reactivar',        color: 'bg-green-600 hover:bg-green-700' },
}

const SECONDARY_OPTIONS: Partial<Record<TournamentStatus, Array<{ status: TournamentStatus; label: string }>>> = {
  ACTIVO:     [{ status: 'POSPUESTO', label: 'Posponer' }, { status: 'SUSPENDIDO', label: 'Suspender' }, { status: 'CANCELADO', label: 'Cancelar' }],
  EN_JUEGO:   [{ status: 'POSPUESTO', label: 'Posponer' }, { status: 'SUSPENDIDO', label: 'Suspender' }, { status: 'CANCELADO', label: 'Cancelar' }],
  FINALIZADO: [{ status: 'EN_JUEGO',  label: 'Reabrir' }],
  PROCESADO:  [{ status: 'FINALIZADO', label: 'Volver a Finalizado' }],
  CANCELADO:  [{ status: 'ACTIVO', label: 'Reactivar' }],
}

export default function TorneoActions({ torneoId, status, canEdit, isAdmin }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSecondary, setShowSecondary] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!canEdit && !isAdmin) return null

  async function changeStatus(newStatus: TournamentStatus) {
    setLoading(newStatus)
    setError(null)
    try {
      const res = await fetch(`/api/torneos/${torneoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al actualizar')
      } else {
        router.refresh()
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(null)
      setShowSecondary(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este torneo? Esta acción no se puede deshacer y borrará todas las tarjetas, reservas y resultados asociados.')) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/torneos/${torneoId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al eliminar')
        setDeleting(false)
      } else {
        router.push('/torneos')
      }
    } catch {
      setError('Error de conexión')
      setDeleting(false)
    }
  }

  const next = NEXT_STATUS[status]
  const secondary = SECONDARY_OPTIONS[status] ?? []
  const busy = loading !== null || deleting

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex items-center gap-2 flex-wrap justify-end">

        {/* Editar condiciones */}
        {canEdit && (
          <Link
            href={`/torneos/${torneoId}/editar`}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Editar
          </Link>
        )}

        {/* Acción principal de estado */}
        {next && canEdit && (
          <button
            onClick={() => changeStatus(next.status)}
            disabled={busy}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${next.color}`}
          >
            {loading === next.status ? 'Guardando...' : next.label}
          </button>
        )}

        {/* Acciones secundarias de estado */}
        {secondary.length > 0 && canEdit && (
          <div className="relative">
            <button
              onClick={() => setShowSecondary((v) => !v)}
              disabled={busy}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              ···
            </button>
            {showSecondary && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                {secondary.map((opt) => (
                  <button
                    key={opt.status}
                    onClick={() => changeStatus(opt.status)}
                    disabled={busy}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg disabled:opacity-50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Eliminar (solo ADMIN) */}
        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={busy}
            className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
