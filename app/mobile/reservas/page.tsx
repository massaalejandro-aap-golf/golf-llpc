import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import NavLink from '@/components/NavLink'

export const dynamic = 'force-dynamic'

function fmtFecha(d: Date) {
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function fmtHora(d: Date) {
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default async function MobileReservasPage() {
  await requireSession()

  const torneos = await prisma.tournament.findMany({
    where: {
      reservasHabilitadas: true,
      status: { notIn: ['FINALIZADO', 'PROCESADO', 'CANCELADO', 'SUSPENDIDO'] },
    },
    orderBy: { fecha: 'asc' },
    select: {
      id: true, nombre: true, fecha: true, tipo: true,
      teeTimeSlots: {
        select: {
          id: true, hora: true, hoyoSalida: true, bloqueado: true,
          players: { select: { id: true } },
        },
        orderBy: { hora: 'asc' },
      },
    },
  })

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-green-700 text-white px-6 pt-10 pb-6">
        <p className="text-green-200 text-sm font-medium tracking-wide uppercase">La Lucila Golf Club</p>
        <h1 className="text-xl font-bold mt-1">Reservas</h1>
      </div>

      <div className="flex-1 px-4 py-5 space-y-3">
        {torneos.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-semibold text-gray-700">No hay torneos para hacer reservas</p>
            <p className="text-sm mt-2 text-gray-400">Cuando se habiliten las reservas para un torneo, aparecerán aquí.</p>
          </div>
        ) : (
          torneos.map((t) => {
            const slotsLibres = t.teeTimeSlots.filter(
              (s) => !s.bloqueado && s.players.length < 4
            ).length
            return (
              <NavLink
                key={t.id}
                href={`/mobile/reservas/${t.id}`}
                className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm active:scale-95 transition-transform"
              >
                <span className="text-2xl">📅</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{t.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {fmtFecha(t.fecha)}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5 font-medium">
                    {slotsLibres} lugar{slotsLibres !== 1 ? 'es' : ''} disponible{slotsLibres !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-gray-300 text-lg shrink-0">›</span>
              </NavLink>
            )
          })
        )}
      </div>

      <div className="p-4">
        <NavLink
          href="/mobile"
          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-5 py-4 font-semibold active:scale-95 transition-transform"
        >
          ← Volver al menú
        </NavLink>
      </div>
    </div>
  )
}
