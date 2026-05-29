import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import AAGBuscador from './AAGBuscador'

export default async function JugadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; genero?: string }>
}) {
  await requireSession()
  const params = await searchParams
  const q = params.q?.trim() || ''
  const tipo = params.tipo || ''
  const genero = params.genero || ''

  const jugadores = await prisma.player.findMany({
    where: {
      activo: true,
      ...(q && {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { apellido: { contains: q, mode: 'insensitive' } },
          { matricula: { contains: q, mode: 'insensitive' } },
        ],
      }),
      ...(tipo && { tipo: tipo as 'SOCIO' | 'INVITADO' | 'SOCIO_TEMPORARIO' | 'INVITADO_TEMPORARIO' }),
      ...(genero && { genero: genero as 'DAMA' | 'CABALLERO' }),
    },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Jugadores</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{jugadores.length} encontrados</span>
          <Link
            href="/jugadores/nuevo"
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Nuevo jugador
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <form className="flex gap-3 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o matrícula..."
          className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          name="genero"
          defaultValue={genero}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
        >
          <option value="">Todos</option>
          <option value="DAMA">Damas</option>
          <option value="CABALLERO">Caballeros</option>
        </select>
        <select
          name="tipo"
          defaultValue={tipo}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
        >
          <option value="">Todo tipo</option>
          <option value="SOCIO">Socios</option>
          <option value="INVITADO">Invitados</option>
          <option value="SOCIO_TEMPORARIO">Socios temporarios</option>
          <option value="INVITADO_TEMPORARIO">Invitados temporarios</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
        >
          Buscar
        </button>
      </form>

      {/* Lookup AAG automático cuando se busca por número de matrícula */}
      {/^\d{3,8}$/.test(q) && (
        <AAGBuscador
          matricula={q}
          yaExiste={jugadores.some((j) => j.matricula === q)}
        />
      )}

      {/* Tabla */}
      {jugadores.length === 0 ? (
        <p className="text-center text-gray-400 py-12">No se encontraron jugadores.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Matrícula</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Apellido y nombre</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">HCP</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Categoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jugadores.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    {j.matricula ? (
                      <span className="font-mono font-semibold text-gray-800 text-sm">{j.matricula}</span>
                    ) : (
                      <span className="text-xs text-amber-500 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/jugadores/${j.id}`}
                      className="font-medium text-gray-900 hover:text-green-700"
                    >
                      {j.apellido}, {j.nombre}
                    </Link>
                    <div className="text-xs text-gray-400">
                      {j.genero === 'DAMA' ? 'Dama' : 'Caballero'}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center font-medium text-gray-900">
                    {j.hcpIndex.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell text-xs">
                    {j.tipo.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell text-xs">
                    {j.categoria ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
