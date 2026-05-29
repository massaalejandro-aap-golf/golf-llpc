import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export default async function ReservasPage() {
  await requireSession()

  const torneos = await prisma.tournament.findMany({
    where: { reservasHabilitadas: true },
    orderBy: { fecha: 'desc' },
    include: {
      course: { select: { nombre: true } },
      _count: { select: { teeTimeSlots: true } },
      teeTimeSlots: {
        select: {
          _count: { select: { players: true } },
          bloqueado: true,
        },
      },
    },
  })

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const proximos = torneos.filter((t) => new Date(t.fecha) >= hoy)
  const pasados  = torneos.filter((t) => new Date(t.fecha) <  hoy)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
      </div>

      {torneos.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-base">No hay torneos con reservas habilitadas.</p>
          <p className="text-sm mt-1">Al crear un torneo, activá la opción <strong>Habilitar reservas</strong>.</p>
        </div>
      )}

      {proximos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Próximos</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {proximos.map((t) => (
              <TorneoCard key={t.id} torneo={t} />
            ))}
          </div>
        </section>
      )}

      {pasados.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Anteriores</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pasados.map((t) => (
              <TorneoCard key={t.id} torneo={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function TorneoCard({
  torneo,
}: {
  torneo: {
    id: number
    nombre: string
    nombrePlanilla: string | null
    fecha: Date
    jugadoresPorLinea: number
    course: { nombre: string }
    _count: { teeTimeSlots: number }
    teeTimeSlots: { _count: { players: number }; bloqueado: boolean }[]
  }
}) {
  const nombre = torneo.nombrePlanilla || torneo.nombre
  const fecha  = new Date(torneo.fecha).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const totalSlots    = torneo._count.teeTimeSlots
  const totalJugadores = torneo.teeTimeSlots
    .filter((s) => !s.bloqueado)
    .reduce((acc, s) => acc + s._count.players, 0)
  const maxJugadores = torneo.teeTimeSlots
    .filter((s) => !s.bloqueado)
    .length * torneo.jugadoresPorLinea

  const hoy  = new Date(); hoy.setHours(0, 0, 0, 0)
  const esHoy = new Date(torneo.fecha).toDateString() === hoy.toDateString()

  return (
    <Link
      href={`/torneos/${torneo.id}/reservas`}
      className="group block bg-white rounded-xl border border-gray-100 shadow-sm hover:border-green-300 hover:shadow-md transition-all p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate group-hover:text-green-800">
            {nombre}
          </p>
          <p className="text-xs text-gray-500 capitalize mt-0.5">{fecha}</p>
          <p className="text-xs text-gray-400 mt-0.5">{torneo.course.nombre}</p>
        </div>
        {esHoy && (
          <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            Hoy
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        {totalSlots === 0 ? (
          <span className="text-amber-600 font-medium">Sin planilla generada</span>
        ) : (
          <>
            <span>{totalSlots} turnos</span>
            <span className="text-gray-300">·</span>
            <span>
              <strong className={`${totalJugadores > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                {totalJugadores}
              </strong>
              {maxJugadores > 0 && <span className="text-gray-400"> / {maxJugadores}</span>}
              {' '}inscriptos
            </span>
          </>
        )}
      </div>
    </Link>
  )
}
