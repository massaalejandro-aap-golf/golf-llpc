'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MatriculaResult as AAGPlayer } from '@/app/api/aag/matricula/route'

interface Props {
  matricula: string
  /** Si ya existe un jugador local con esta matrícula, no mostrar */
  yaExiste?: boolean
}

export default function AAGBuscador({ matricula, yaExiste }: Props) {
  const [player, setPlayer]   = useState<AAGPlayer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (yaExiste) { setLoading(false); return }

    fetch(`/api/aag/matricula?id=${encodeURIComponent(matricula)}`)
      .then((r) => r.json())
      .then((data: AAGPlayer & { error?: string }) => {
        if (data.error) setError(data.error)
        else setPlayer(data)
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [matricula, yaExiste])

  if (yaExiste || (!loading && !player && !error)) return null

  return (
    <div className={`rounded-xl border px-5 py-4 ${
      loading ? 'bg-gray-50 border-gray-200' :
      error   ? 'bg-red-50 border-red-200' :
                'bg-green-50 border-green-200'
    }`}>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Consultando padrón AAG…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : player ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">
              Encontrado en el padrón AAG
            </p>
            <p className="font-semibold text-gray-900 text-base">
              {player.apellido}, {player.nombre}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-sm text-gray-500">
              <span>Mat. <strong className="text-gray-700">{player.matricula}</strong></span>
              <span className="text-gray-300">·</span>
              <span>
                HCP{' '}
                <strong className="text-green-700 text-base">{player.hcpIndex?.toFixed(1) ?? '—'}</strong>
              </span>
              <span className="text-gray-300">·</span>
              <span>{player.genero === 'DAMA' ? 'Dama' : 'Caballero'}</span>
              {player.dni && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>DNI {player.dni}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              const p = new URLSearchParams({ matricula: player.matricula })
              if (player.nombre)   p.set('nombre',   player.nombre)
              if (player.apellido) p.set('apellido', player.apellido)
              p.set('genero', player.genero)
              if (player.hcpIndex != null) p.set('hcp', String(player.hcpIndex))
              router.push(`/jugadores/nuevo?${p.toString()}`)
            }}
            className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Crear ficha
          </button>
        </div>
      ) : null}
    </div>
  )
}
