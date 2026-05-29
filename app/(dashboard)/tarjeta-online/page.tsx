import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export default async function TarjetaOnlinePage() {
  const session = await requireSession()

  // Torneos donde el SOCIO tiene reserva Y el torneo está activo/pendiente
  const isStaff = session.role === 'ADMIN' || session.role === 'COMISION'

  const torneos = isStaff
    ? await prisma.tournament.findMany({
        where: { status: { in: ['ACTIVO', 'EN_JUEGO'] } },
        orderBy: { fecha: 'asc' },
        select: { id: true, nombre: true, fecha: true, tipo: true, hoyos: true, course: { select: { nombre: true } } },
      })
    : await prisma.tournament.findMany({
        where: {
          status: { in: ['ACTIVO', 'EN_JUEGO'] },
          teeTimeSlots: {
            some: { players: { some: { playerId: session.playerId ?? 0 } } },
          },
        },
        orderBy: { fecha: 'asc' },
        select: { id: true, nombre: true, fecha: true, tipo: true, hoyos: true, course: { select: { nombre: true } } },
      })

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Tarjeta Online</h1>

      {torneos.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">⛳</p>
          <p className="text-base">No hay torneos activos con reserva.</p>
        </div>
      )}

      <div className="space-y-3">
        {torneos.map((t) => (
          <Link
            key={t.id}
            href={`/tarjeta-online/${t.id}`}
            className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:border-green-300 hover:shadow-md transition-all p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{t.nombre}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(t.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' · '}{t.course.nombre}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{t.tipo.replace(/_/g, ' ')} · {t.hoyos} hoyos</p>
              </div>
              <span className="text-green-600 font-bold text-lg">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
