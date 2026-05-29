'use client'

import { useState } from 'react'

export default function ResetPasswordButton({ jugadorId, matricula }: { jugadorId: number; matricula: string }) {
  const [state, setState] = useState<'idle' | 'confirm' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleConfirm() {
    setState('loading')
    const res = await fetch(`/api/jugadores/${jugadorId}/reset-password`, { method: 'POST' })
    if (res.ok) {
      setState('done')
    } else {
      const data = await res.json()
      setErrorMsg(data.error || 'Error')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <span className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
        ✓ Contraseña reseteada a matrícula
      </span>
    )
  }

  if (state === 'error') {
    return <span className="text-xs text-red-600">{errorMsg}</span>
  }

  if (state === 'confirm') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">¿Resetear a matrícula {matricula}?</span>
        <button
          onClick={handleConfirm}
          className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors"
        >
          Confirmar
        </button>
        <button
          onClick={() => setState('idle')}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setState('confirm')}
      className="text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
    >
      Resetear contraseña
    </button>
  )
}
