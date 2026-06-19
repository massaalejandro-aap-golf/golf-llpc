'use client'

import { useState } from 'react'

type Player = {
  id: number; nombre: string; apellido: string; matricula: string | null
  hcpIndex: number; genero: string; tipo: string; categoria: string | null
  email: string | null; telefono: string | null; dni: string | null; fechaNac: string | null; activo: boolean
}

const TIPO_LABEL: Record<string, string> = {
  SOCIO: 'Socio', INVITADO: 'Invitado',
  SOCIO_TEMPORARIO: 'Socio temporario', INVITADO_TEMPORARIO: 'Invitado temporario',
}

export default function MisDatosForm({ player }: { player: Player }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail]       = useState(player.email ?? '')
  const [telefono, setTelefono] = useState(player.telefono ?? '')
  const [dni, setDni]           = useState(player.dni ?? '')
  const [fechaNac, setFechaNac] = useState(
    player.fechaNac ? player.fechaNac.substring(0, 10) : ''
  )

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/mobile/mis-datos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:    email || null,
          telefono: telefono || null,
          dni:      dni || null,
          fechaNac: fechaNac || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      setSuccess(true)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          ✅ Datos actualizados correctamente.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Datos fijos (no editables por el socio) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos del socio</h3>

        <InfoRow label="Nombre" value={`${player.apellido}, ${player.nombre}`} />
        <InfoRow label="Matrícula AAG" value={player.matricula ?? '—'} />
        <InfoRow label="Handicap Index" value={player.hcpIndex.toFixed(1)} highlight />
        <InfoRow label="Género" value={player.genero === 'DAMA' ? 'Dama' : 'Caballero'} />
        <InfoRow label="Tipo" value={TIPO_LABEL[player.tipo] ?? player.tipo} />
        {player.categoria && <InfoRow label="Categoría" value={player.categoria} />}
      </div>

      {/* Datos editables */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos de contacto</h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-green-600 hover:text-green-700"
            >
              ✏️ Editar
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <FormField label="Email" type="email" value={email} onChange={setEmail} />
            <FormField label="Teléfono" type="tel" value={telefono} onChange={setTelefono} />
            <FormField label="DNI" type="text" value={dni} onChange={setDni} />
            <FormField label="Fecha de nacimiento" type="date" value={fechaNac} onChange={setFechaNac} />

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setEditing(false); setError(null) }}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 active:scale-95 transition-transform"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 active:scale-95 transition-transform"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <InfoRow label="Email" value={player.email ?? '—'} />
            <InfoRow label="Teléfono" value={player.telefono ?? '—'} />
            <InfoRow label="DNI" value={player.dni ?? '—'} />
            <InfoRow
              label="Fecha de nacimiento"
              value={
                player.fechaNac
                  ? new Date(player.fechaNac).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-green-700 font-bold text-lg' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  )
}

function FormField({ label, type, value, onChange }: {
  label: string; type: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )
}
