'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Jugador {
  id: number
  matricula: string | null
  nombre: string
  apellido: string
  hcpIndex: number
  genero: 'DAMA' | 'CABALLERO'
}

export default function NuevaTarjetaButton({ torneoId }: { torneoId: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Jugador[]>([])
  const [fetching, setFetching] = useState(false)
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setFetching(true)
    try {
      const res = await fetch(`/api/jugadores?q=${encodeURIComponent(q)}&take=10`)
      if (res.ok) setResults(await res.json())
    } finally { setFetching(false) }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => search(val), 250)
  }

  async function handleSelect(jugador: Jugador) {
    setCreating(true)
    try {
      const res = await fetch(`/api/torneos/${torneoId}/tarjetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: jugador.id, ronda: 1 }),
      })
      const data = await res.json()
      if (res.status === 409 && data.id) {
        // Ya existe — ir a esa tarjeta
        router.push(`/torneos/${torneoId}/tarjetas/${data.id}`)
      } else if (res.ok) {
        router.push(`/torneos/${torneoId}/tarjetas/${data.id}`)
      } else {
        alert(data.error || 'Error al crear tarjeta')
        setCreating(false)
      }
    } catch {
      alert('Error de conexión')
      setCreating(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
      >
        + Nueva tarjeta
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-72 p-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">Buscar jugador</p>
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder="Apellido o matrícula..."
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={creating}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          />
          {fetching && <p className="text-xs text-gray-400 text-center">Buscando...</p>}
          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg">
              {results.map((j) => (
                <button
                  key={j.id}
                  onClick={() => handleSelect(j)}
                  disabled={creating}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 flex items-center gap-2 disabled:opacity-50"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${j.genero === 'DAMA' ? 'bg-pink-400' : 'bg-blue-400'}`} />
                  <span className="font-medium text-gray-800">{j.apellido}, {j.nombre}</span>
                  <span className="text-gray-400 ml-auto">{j.hcpIndex.toFixed(1)}</span>
                </button>
              ))}
            </div>
          )}
          {query.length >= 2 && !fetching && results.length === 0 && (
            <p className="text-xs text-gray-400 text-center">No se encontraron jugadores</p>
          )}
          {creating && <p className="text-xs text-green-600 text-center">Creando tarjeta...</p>}
        </div>
      )}
    </div>
  )
}
