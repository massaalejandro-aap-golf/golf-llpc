'use client'

import { useState } from 'react'

type HandicapData = {
  matricula:  string | null
  nombre:     string
  apellido:   string
  hcpIndex:   number
  teeNombre:  string
  slope:      number
  rating:     number
  par:        number
  ch100:      number
  ch85:       number
}

function HandicapCard({ data }: { data: HandicapData }) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{data.apellido}, {data.nombre}</p>
          {data.matricula && (
            <p className="text-gray-500 text-sm mt-1">
              Matrícula: <span className="font-semibold text-gray-700">{data.matricula}</span>
            </p>
          )}
        </div>
        <div className="border-t border-gray-100 pt-3 mt-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Handicap Index</p>
          <p className="text-5xl font-bold text-green-700 mt-1">{data.hcpIndex.toFixed(1)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wide">
          Handicap de juego — Tee {data.teeNombre}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">100%</p>
            <p className="text-4xl font-bold text-green-800 mt-1">{data.ch100}</p>
            <p className="text-xs text-green-600 mt-1">Allowance completo</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">85%</p>
            <p className="text-4xl font-bold text-blue-800 mt-1">{data.ch85}</p>
            <p className="text-xs text-blue-600 mt-1">Medal / Stableford</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">
          Slope {data.slope} · Rating {data.rating} · Par {data.par}
        </p>
      </div>
    </div>
  )
}

export default function HandicapBuscador({ myHandicap }: { myHandicap: HandicapData | null }) {
  const [matricula, setMatricula] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [result, setResult]       = useState<HandicapData | null>(null)

  // Jugador mostrado: resultado de búsqueda o jugador propio
  const displayed = result ?? myHandicap

  async function buscar() {
    const mat = matricula.trim()
    if (!mat) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/mobile/handicap?matricula=${encodeURIComponent(mat)}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'No encontrado'); return }
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  function limpiar() {
    setMatricula('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Buscar por matrícula
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Ej: 12345"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={buscar}
            disabled={loading || !matricula.trim()}
            className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
          >
            {loading ? '…' : 'Buscar'}
          </button>
          {result && (
            <button
              onClick={limpiar}
              className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
            >
              ✕
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-2">{error}</p>
        )}
        {result && (
          <p className="text-xs text-gray-400 mt-2">
            Mostrando matrícula {result.matricula} ·{' '}
            <button onClick={limpiar} className="text-green-600 font-medium">Ver mis datos</button>
          </p>
        )}
      </div>

      {/* Resultado */}
      {displayed ? (
        <HandicapCard data={displayed} />
      ) : (
        <div className="text-center text-gray-400 py-12">
          <p className="text-4xl mb-3">⛳</p>
          <p className="text-sm">Ingresá una matrícula para buscar</p>
        </div>
      )}
    </div>
  )
}
