'use client'

import { useState } from 'react'
import type { SyncStatus, SyncDetail } from '@/lib/aag-sync'

function statusBadge(s: SyncStatus['status']) {
  switch (s) {
    case 'success': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ OK</span>
    case 'error':   return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">✕ Error</span>
    case 'running': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⟳ Corriendo…</span>
    default:        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">— Sin datos</span>
  }
}

function resultBadge(r: SyncDetail['resultado']) {
  switch (r) {
    case 'updated':   return <span className="text-xs font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Actualizado</span>
    case 'not_found': return <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">No encontrado</span>
    case 'skipped':   return <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Inactivo</span>
    case 'error':     return <span className="text-xs font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded">Error</span>
  }
}

type NormResult = { total: number; fixed: number; changes: { id: number; antes: string; despues: string }[] }
type MigrResult = { creados: number; omitidos: number; total: number }

export default function AagSyncClient({ initial }: { initial: SyncStatus }) {
  const [status,  setStatus]  = useState<SyncStatus>(initial)
  const [syncing, setSyncing] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Normalizar nombres
  const [norming,     setNorming]     = useState(false)
  const [normResult,  setNormResult]  = useState<NormResult | null>(null)
  const [normError,   setNormError]   = useState<string | null>(null)

  // Migrar usuarios
  const [migrating,   setMigrating]   = useState(false)
  const [migrResult,  setMigrResult]  = useState<MigrResult | null>(null)
  const [migrError,   setMigrError]   = useState<string | null>(null)

  async function triggerNormalize() {
    if (!confirm('¿Corregir todos los nombres con formato incorrecto? Esta acción modifica la base de datos.')) return
    setNorming(true)
    setNormResult(null)
    setNormError(null)
    try {
      const res = await fetch('/api/jugadores/normalizar-nombres', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) setNormError(data.error ?? 'Error')
      else setNormResult(data)
    } catch { setNormError('Error de red') }
    finally { setNorming(false) }
  }

  async function triggerMigrarUsuarios() {
    if (!confirm('¿Crear usuarios para todos los jugadores con matrícula que aún no tengan acceso al sistema?')) return
    setMigrating(true)
    setMigrResult(null)
    setMigrError(null)
    try {
      const res = await fetch('/api/admin/migrar-usuarios', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) setMigrError(data.error ?? 'Error')
      else setMigrResult(data)
    } catch { setMigrError('Error de red') }
    finally { setMigrating(false) }
  }

  async function triggerSync() {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/sync/aag', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error desconocido')
      } else {
        setStatus(data)
      }
    } catch (e) {
      setError('Error de red')
    } finally {
      setSyncing(false)
    }
  }

  const lastSync = status.lastSync
    ? new Date(status.lastSync).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              Sincronización AAG
              {statusBadge(status.status)}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {lastSync ? `Último sync: ${lastSync}` : 'Nunca sincronizado'}
            </p>
            {status.status !== 'idle' && status.lastSync && (
              <p className="text-sm text-gray-700 mt-2">{status.message}</p>
            )}
          </div>

          <button
            type="button"
            onClick={triggerSync}
            disabled={syncing || status.status === 'running'}
            className="flex-shrink-0 px-4 py-2 text-sm rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {syncing ? '⟳ Sincronizando…' : '↻ Sincronizar ahora'}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Stats row */}
        {status.lastSync && (
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { label: 'Actualizados', value: status.updated,  color: 'text-green-700 bg-green-50' },
              { label: 'No encontrados', value: status.notFound, color: 'text-amber-700 bg-amber-50' },
              { label: 'Inactivos',    value: status.skipped,  color: 'text-gray-600 bg-gray-100' },
              { label: 'Errores',      value: status.errors,   color: 'text-red-700 bg-red-50' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${color}`}>
                <span className="text-lg font-bold mr-1">{value}</span>{label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cron info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-1">⏰ Sync automático activo</h3>
        <p className="text-xs text-blue-700">
          La AAG actualiza los handicaps todos los <strong>viernes</strong>. El sync automático corre
          los viernes a las <strong>6:00 AM hora Argentina</strong> vía node-cron integrado en el servidor.
        </p>
        <code className="block mt-2 text-xs bg-blue-100 text-blue-800 rounded px-2 py-1">
          0 9 * * 5 (UTC) — instrumentation.ts
        </code>
      </div>

      {/* Normalizar nombres */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Corregir nombres</h2>
            <p className="text-xs text-gray-500 mt-1">
              Convierte todos los nombres a formato uniforme: primera letra mayúscula, resto minúsculas (ej: <span className="font-mono">GARCIA JUAN</span> → <span className="font-mono">Garcia Juan</span>).
            </p>
          </div>
          <button
            type="button"
            onClick={triggerNormalize}
            disabled={norming}
            className="flex-shrink-0 px-4 py-2 text-sm rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {norming ? 'Corrigiendo…' : 'Corregir nombres'}
          </button>
        </div>

        {normError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{normError}</p>
        )}

        {normResult && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-green-700">{normResult.fixed}</span> de {normResult.total} jugadores corregidos.
            </p>
            {normResult.changes.length > 0 && (
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Antes</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Después</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {normResult.changes.map((c) => (
                      <tr key={c.id}>
                        <td className="px-3 py-1.5 text-red-600 font-mono">{c.antes}</td>
                        <td className="px-3 py-1.5 text-green-700 font-mono">{c.despues}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Migrar usuarios */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Activar acceso de golfistas</h2>
            <p className="text-xs text-gray-500 mt-1">
              Crea usuarios para todos los jugadores con matrícula que aún no puedan ingresar al sistema.
              Usuario y contraseña inicial = número de matrícula.
            </p>
          </div>
          <button
            type="button"
            onClick={triggerMigrarUsuarios}
            disabled={migrating}
            className="flex-shrink-0 px-4 py-2 text-sm rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {migrating ? 'Procesando…' : 'Activar accesos'}
          </button>
        </div>
        {migrError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{migrError}</p>
        )}
        {migrResult && (
          <p className="mt-3 text-sm text-gray-700">
            <span className="font-semibold text-green-700">{migrResult.creados}</span> usuarios creados,{' '}
            <span className="text-gray-500">{migrResult.omitidos} ya tenían acceso</span>{' '}
            (total con matrícula: {migrResult.total}).
          </p>
        )}
      </div>

      {/* Detail table */}
      {status.details.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Detalle del último sync</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Matrícula</th>
                  <th className="px-4 py-2 text-left font-medium">Nombre</th>
                  <th className="px-4 py-2 text-center font-medium">HCP</th>
                  <th className="px-4 py-2 text-center font-medium">Resultado</th>
                  <th className="px-4 py-2 text-left font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {status.details.map((d) => (
                  <tr key={d.matricula} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{d.matricula}</td>
                    <td className="px-4 py-2.5 text-gray-900 font-medium">
                      {d.nombre} {d.apellido}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-gray-800">
                      {d.hcpIndex ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {resultBadge(d.resultado)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{d.mensaje}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
