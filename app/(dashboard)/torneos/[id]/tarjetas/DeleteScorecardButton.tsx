'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  torneoId:    number
  scorecardId: number
  playerName:  string
}

export default function DeleteScorecardButton({ torneoId, scorecardId, playerName }: Props) {
  const router  = useRouter()
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'deleting'>('idle')

  async function handleDelete() {
    setPhase('deleting')
    try {
      const res = await fetch(`/api/torneos/${torneoId}/tarjetas/${scorecardId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Error al eliminar la tarjeta')
        setPhase('idle')
      }
    } catch {
      alert('Error de conexión')
      setPhase('idle')
    }
  }

  if (phase === 'deleting') {
    return <span className="text-xs text-gray-400">Eliminando…</span>
  }

  if (phase === 'confirm') {
    return (
      <span className="flex items-center gap-1.5 justify-end">
        <span className="text-xs text-gray-500 hidden sm:inline">¿Eliminar?</span>
        <button
          onClick={handleDelete}
          className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
        >
          Sí
        </button>
        <button
          onClick={() => setPhase('idle')}
          className="px-2 py-0.5 text-xs border border-gray-300 hover:bg-gray-50 text-gray-600 rounded transition-colors"
        >
          No
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setPhase('confirm')}
      title={`Eliminar tarjeta de ${playerName}`}
      className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </button>
  )
}
