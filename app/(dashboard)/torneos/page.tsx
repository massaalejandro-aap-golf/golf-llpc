import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { TournamentStatus } from '@/app/generated/prisma/client'

const STATUS_LABEL: Record<TournamentStatus, string> = {
  ACTIVO: 'Activo',
  EN_JUEGO: 'En juego',
  FINALIZADO: 'Finalizado',
  PROCESADO: 'Procesado',
  POSPUESTO: 'Pospuesto',
  SUSPENDIDO: 'Suspendido',
  CANCELADO: 'Cancelado',
}

const STATUS_COLOR: Record<TournamentStatus, string> = {
  ACTIVO: 'bg-green-100 text-green-800',
  EN_JUEGO: 'bg-blue-100 text-blue-800',
  FINALIZADO: 'bg-gray-100 text-gray-700',
  PROCESADO: 'bg-purple-100 text-purple-800',
  POSPUESTO: 'bg-yellow-100 text-yellow-800',
  SUSPENDIDO: 'bg-orange-100 text-orange-800',
  CANCELADO: 'bg-red-100 text-red-800',
}

export default async function TorneosPage() {
  await requireSession()

  const torneos = await prisma.tournament.findMany({
    orderBy: { fecha: 'desc' },
    take: 50,
    include: {
      course: { select: { nombre: true } },
      categories: { select: { genero: true, nombre: true } },
      _count: { select: { scorecards: true, teeTimeSlots: true } },
    },
  })

  const formatFecha = (d: Date) =>
    new Date(d).toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const tipoLabel = (tipo: string) =>
    tipo.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Torneos</h1>
        <Link
          href="/torneos/nuevo"
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo torneo
        </Link>
      </div>

      {torneos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🏌️</p>
          <p className="text-lg">No hay torneos cargados todavía.</p>
          <Link
            href="/torneos/nuevo"
            className="mt-4 inline-block text-green-600 hover:underline text-sm"
          >
            Crear el primer torneo
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Torneo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">
                  Cancha
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">
                  Tarjetas
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {torneos.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatFecha(t.fecha)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/torneos/${t.id}`}
                      className="font-medium text-gray-900 hover:text-green-700"
                    >
                      {t.nombre}
                    </Link>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t.hoyos === 'EIGHTEEN' ? '18 hoyos' : '9 hoyos'} · {t.ronda}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {tipoLabel(t.tipo)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">
                    {t.course.nombre}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[t.status]}`}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">
                    {t._count.scorecards}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/torneos/${t.id}`}
                      className="text-green-600 hover:text-green-800 text-xs font-medium"
                    >
                      Ver →
                    </Link>
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
