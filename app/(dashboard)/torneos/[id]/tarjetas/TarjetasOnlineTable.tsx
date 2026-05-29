'use client'

import { useState, useEffect, useCallback } from 'react'

interface OnlineSc {
  id: number
  ronda: number
  playerId: number
  marcadorPlayerId: number | null
  onlineEstado: string
  updatedAt: string
  player:   { matricula: string | null; nombre: string; apellido: string }
  marcador: { matricula: string | null; nombre: string; apellido: string } | null
  entries:  { holeId: number; golpes: number }[]
}

function ScTable({ title, rows, holeNums, canEdit, onValidar, onBorrar, showActions }: {
  title: string
  rows: OnlineSc[]
  holeNums: number[]
  canEdit: boolean
  showActions: boolean
  onValidar: (id: number) => void
  onBorrar: (id: number) => void
}) {
  const estadoStyle: Record<string, string> = {
    SIENDO_CARGADA: 'bg-yellow-100 text-yellow-700',
    COMPLETA:       'bg-blue-100 text-blue-700',
    VALIDADA:       'bg-green-100 text-green-700',
  }
  const estadoLabel: Record<string, string> = {
    SIENDO_CARGADA: 'Siendo cargada',
    COMPLETA:       'Completa',
    VALIDADA:       'Validada',
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-teal-600 text-white font-semibold text-center">
            <th className="px-3 py-2 text-left">Mat.</th>
            <th className="px-3 py-2 text-left">Nombre</th>
            <th className="px-3 py-2 text-left">Marker</th>
            <th className="px-3 py-2">Estado</th>
            {holeNums.map((n) => <th key={n} className="w-7 py-2">{n}</th>)}
            <th className="px-3 py-2">Actualizada</th>
            {canEdit && showActions && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((sc) => (
            <tr key={sc.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-mono text-gray-600">{sc.player.matricula ?? '—'}</td>
              <td className="px-3 py-2 font-medium text-gray-900">{sc.player.apellido}, {sc.player.nombre}</td>
              <td className="px-3 py-2 text-gray-500">
                {sc.marcador ? `${sc.marcador.matricula} ${sc.marcador.apellido}` : '—'}
              </td>
              <td className="px-3 py-2 text-center">
                <span className={`px-2 py-0.5 rounded-full font-medium ${estadoStyle[sc.onlineEstado] ?? 'bg-gray-100 text-gray-600'}`}>
                  {estadoLabel[sc.onlineEstado] ?? sc.onlineEstado}
                </span>
              </td>
              {holeNums.map((_, idx) => (
                <td key={idx} className="text-center py-2 font-semibold text-gray-700">
                  {sc.entries[idx]?.golpes ?? <span className="text-gray-200">·</span>}
                </td>
              ))}
              <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                {new Date(sc.updatedAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </td>
              {canEdit && showActions && (
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1 items-end">
                    {sc.onlineEstado !== 'VALIDADA' && (
                      <button onClick={() => onValidar(sc.id)}
                        className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded font-medium">
                        Enviar al Buzón
                      </button>
                    )}
                    <button onClick={() => onBorrar(sc.id)}
                      className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded font-medium">
                      Borrar
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TarjetasOnlineTable({
  torneoId, canEdit, holes,
}: {
  torneoId: number; canEdit: boolean; holes: number[]
}) {
  const [data, setData] = useState<OnlineSc[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch(`/api/torneos/${torneoId}/tarjetas-online`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [torneoId])

  useEffect(() => { load() }, [load])

  async function handleValidar(scId: number) {
    await fetch(`/api/tarjeta-online/${scId}/validar`, { method: 'POST' })
    load()
  }
  async function handleBorrar(scId: number) {
    if (!confirm('¿Borrar esta tarjeta?')) return
    await fetch(`/api/torneos/${torneoId}/tarjetas/${scId}`, { method: 'DELETE' })
    load()
  }

  if (loading) return null

  const ronda1 = data.filter((s) => s.ronda === 1)
  const ronda2 = data.filter((s) => s.ronda === 2)
  const holeNums = holes.slice().sort((a, b) => a - b)

  if (ronda1.length === 0 && ronda2.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Tarjetas válidas (ronda=1) */}
      {ronda1.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
            <span className="text-amber-700 font-semibold text-sm">📱 Tarjetas Online</span>
            <span className="text-xs text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">{ronda1.length}</span>
          </div>
          <ScTable title="online" rows={ronda1} holeNums={holeNums} canEdit={canEdit}
            showActions={true} onValidar={handleValidar} onBorrar={handleBorrar} />
        </div>
      )}

      {/* Tarjetas de control (ronda=2) */}
      {ronda2.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="text-gray-500 font-semibold text-sm">🗒️ Tarjetas de Control</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{ronda2.length}</span>
            <span className="text-xs text-gray-400 ml-1">— control personal del marcador, no válidas para el torneo</span>
          </div>
          <ScTable title="control" rows={ronda2} holeNums={holeNums} canEdit={canEdit}
            showActions={false} onValidar={handleValidar} onBorrar={handleBorrar} />
        </div>
      )}
    </div>
  )
}
