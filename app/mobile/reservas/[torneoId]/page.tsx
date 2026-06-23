import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import NavLink from '@/components/NavLink'
import ReservasTorneo from './ReservasTorneo'

export const dynamic = 'force-dynamic'

export default async function MobileReservasTorneoPage({
  params,
}: {
  params: Promise<{ torneoId: string }>
}) {
  const session = await requireSession()
  const { torneoId } = await params
  const id = parseInt(torneoId)
  if (isNaN(id)) notFound()

  const torneo = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      fecha: true,
      jugadoresPorLinea: true,
      reservasHabilitadas: true,
      status: true,
      teeTimeSlots: {
        orderBy: { hora: 'asc' },
        select: {
          id: true,
          hora: true,
          hoyoSalida: true,
          bloqueado: true,
          players: {
            select: {
              id: true,
              playerId: true,
              posicion: true,
              carro: true,
              reservedByUserId: true,
              player: { select: { id: true, nombre: true, apellido: true, hcpIndex: true, matricula: true } },
            },
          },
        },
      },
    },
  })

  if (!torneo) notFound()

  // Serializar fechas
  const torneoSerialized = {
    ...torneo,
    fecha: torneo.fecha.toISOString(),
    teeTimeSlots: torneo.teeTimeSlots.map((s) => ({
      ...s,
      hora: s.hora.toISOString(),
    })),
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-green-700 text-white px-6 pt-10 pb-6">
        <p className="text-green-200 text-sm font-medium tracking-wide uppercase">Reservas</p>
        <h1 className="text-lg font-bold mt-1 leading-snug">{torneo.nombre}</h1>
        <p className="text-green-200 text-xs mt-1">
          {torneo.fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="flex-1">
        <ReservasTorneo
          torneo={torneoSerialized}
          sessionUserId={session.id}
          sessionPlayerId={session.playerId ?? null}
        />
      </div>

      <div className="p-4">
        <NavLink
          href="/mobile/reservas"
          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-5 py-4 font-semibold active:scale-95 transition-transform"
        >
          ← Volver a reservas
        </NavLink>
      </div>
    </div>
  )
}
