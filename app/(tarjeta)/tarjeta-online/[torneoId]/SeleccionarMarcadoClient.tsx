'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Jugador {
  id: number
  nombre: string
  apellido: string
  matricula: string | null
  hcpIndex: number
}

interface Props {
  torneo: { id: number; nombre: string; fecha: string }
  jugadores: Jugador[]
  socioPlayerId: number | null
}

export default function SeleccionarMarcadoClient({ torneo, jugadores, socioPlayerId }: Props) {
  const router = useRouter()
  const [matricula, setMatricula] = useState('')
  const [encontrado, setEncontrado] = useState<Jugador | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [errorBusq, setErrorBusq] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Buscar por matrícula al escribir
  useEffect(() => {
    setEncontrado(null)
    setErrorBusq(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (matricula.length < 4) return
    timerRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/aag/matricula?id=${matricula}`)
        if (res.ok) {
          const data = await res.json()
          setEncontrado({ id: data.playerId ?? 0, nombre: data.nombre, apellido: data.apellido, matricula: data.matricula, hcpIndex: data.hcpIndex ?? 36 })
        } else {
          setErrorBusq('Matrícula no encontrada')
        }
      } catch { setErrorBusq('Error de conexión') }
      finally { setBuscando(false) }
    }, 500)
  }, [matricula])

  async function iniciarCarga(jugador: Jugador) {
    setIniciando(true)
    const res = await fetch('/api/tarjeta-online/iniciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ torneoId: torneo.id, jugadorId: jugador.id, marcaPropia: !!socioPlayerId }),
    })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error ?? 'Error al iniciar')
      setIniciando(false)
      return
    }
    const { jugScId } = await res.json()
    router.push(`/tarjeta-online/${torneo.id}/${jugScId}`)
  }

  const fecha = new Date(torneo.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="bg-green-700 text-white rounded-xl p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-green-200 mb-1">Carga Online de Tarjeta</p>
        <p className="font-bold text-lg">{torneo.nombre}</p>
        <p className="text-sm text-green-100 capitalize">{fecha}</p>
      </div>

      {/* Instrucción */}
      <div className="bg-white rounded-xl p-5 space-y-3 border border-gray-200">
        <p className="font-bold text-green-800 text-base uppercase tracking-wide text-center">
          Ingresá la matrícula del jugador<br />al que le llevás la tarjeta
        </p>
        <input
          type="text"
          inputMode="numeric"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value.replace(/\D/g, ''))}
          placeholder="Matrícula..."
          className="w-full text-center text-2xl font-bold bg-white text-gray-900 border-2 border-gray-300 focus:border-green-500 rounded-xl px-4 py-3 focus:outline-none placeholder-gray-300"
        />
        {buscando && <p className="text-sm text-gray-600 text-center">Buscando...</p>}
        {errorBusq && <p className="text-sm text-red-600 font-medium text-center">{errorBusq}</p>}
        {encontrado && !buscando && (
          <p className="text-lg font-bold text-green-700 text-center">
            {encontrado.apellido.toUpperCase()} {encontrado.nombre.toUpperCase()}
          </p>
        )}
      </div>

      {/* Botón comenzar */}
      <button
        onClick={() => encontrado && iniciarCarga(encontrado)}
        disabled={!encontrado || iniciando}
        className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold text-lg py-4 rounded-xl transition-colors"
      >
        {iniciando ? 'Iniciando...' : 'COMENZAR LA CARGA'}
      </button>

      {/* Lista de jugadores del torneo */}
      {jugadores.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-center text-green-800 font-bold uppercase tracking-wide">
            O tocá el nombre para elegir
          </p>
          <div className="grid grid-cols-2 gap-2">
            {jugadores.map((j) => (
              <button
                key={j.id}
                onClick={() => iniciarCarga(j)}
                disabled={iniciando}
                className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-bold text-sm py-3 px-2 rounded-lg transition-colors truncate"
              >
                {j.apellido.toUpperCase()} {j.nombre.charAt(0)}.
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}