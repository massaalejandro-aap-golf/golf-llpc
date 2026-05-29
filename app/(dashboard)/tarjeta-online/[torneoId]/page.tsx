import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import SeleccionarMarcadoClient from './SeleccionarMarcadoClient'

export default async function TarjetaOnlineTorneoPage(props: { params: Promise<{ torneoId: string }> }) {
  const { torneoId } = await props.params
  const session = await requireSession()

  const torneo = await prisma.tournament.findUnique({
    where: { id: Number(torneoId) },
    select: {
      id: true, nombre: true, fecha: true, hoyos: true,
      teeTimeSlots: {
        include: {
          players: {
            select: {
              playerId: true,
              player: { select: { id: true, nombre: true, apellido: true, matricula: true, hcpIndex: true } },
            },
          },
        },
      },
    },
  })
  if (!torneo) notFound()

  // Todos los jugadores inscriptos en el torneo (sin duplicados)
  const jugadoresMap = new Map<number, { id: number; nombre: string; apellido: string; matricula: string | null; hcpIndex: number }>()
  for (const slot of torneo.teeTimeSlots) {
    for (const sp of slot.players) {
      if (!jugadoresMap.has(sp.playerId)) jugadoresMap.set(sp.playerId, sp.player)
    }
  }
  const jugadores = Array.from(jugadoresMap.values())
    .filter((j) => j.id !== session.playerId) // excluir al propio SOCIO de la lista
    .sort((a, b) => a.apellido.localeCompare(b.apellido))

  return (
    <SeleccionarMarcadoClient
      torneo={{ id: torneo.id, nombre: torneo.nombre, fecha: torneo.fecha.toISOString() }}
      jugadores={jugadores}
      socioPlayerId={session.playerId ?? null}
    />
  )
}
