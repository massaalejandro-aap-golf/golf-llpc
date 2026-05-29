import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import PlanillaClient from './PlanillaClient'

export default async function ReservasPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await requireSession()

  const torneo = await prisma.tournament.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      nombre: true,
      fecha: true,
      jugadoresPorLinea: true,
      status: true,
      teeTimeSlots: {
        orderBy: { hora: 'asc' },
        include: {
          players: {
            select: {
              id: true,
              playerId: true,
              posicion: true,
              carro: true,
              reservedByUserId: true,
              player: {
                select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      },
    },
  })

  if (!torneo) notFound()

  const canEdit = session.role === 'ADMIN' || session.role === 'COMISION'
  const isSocio = session.role === 'SOCIO'
  const socioPlayerId = isSocio ? (session.playerId ?? null) : null
  const socioUserId = isSocio ? session.id : null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/reservas" className="hover:text-green-700">Reservas</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-[200px]">{torneo.nombre}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planilla de reservas</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {torneo.nombre} ·{' '}
            {new Date(torneo.fecha).toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <Link
          href={`/torneos/${torneo.id}`}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Volver al torneo
        </Link>
      </div>

      {/* Planilla interactiva */}
      <PlanillaClient
        torneoId={torneo.id}
        torneoFecha={torneo.fecha.toISOString()}
        jugadoresPorLinea={torneo.jugadoresPorLinea}
        slots={torneo.teeTimeSlots.map((s) => ({ ...s, hora: s.hora.toISOString() }))}
        canEdit={canEdit}
        socioPlayerId={socioPlayerId}
        socioUserId={socioUserId}
      />
    </div>
  )
}
