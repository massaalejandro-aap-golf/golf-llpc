import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export default async function NuevaTarjetaPage(
  props: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ playerId?: string }>
  }
) {
  await requireRole('COMISION')
  const { id } = await props.params
  const { playerId } = await props.searchParams

  if (!playerId) {
    // Sin playerId → redirigir a la lista de tarjetas
    redirect(`/torneos/${id}/tarjetas`)
  }

  // Verificar jugador existe
  const player = await prisma.player.findUnique({
    where: { id: Number(playerId) },
    select: { id: true },
  })
  if (!player) notFound()

  // Crear tarjeta (o encontrar existente) y redirigir
  const existing = await prisma.scorecard.findUnique({
    where: {
      tournamentId_playerId_ronda: {
        tournamentId: Number(id),
        playerId: Number(playerId),
        ronda: 1,
      },
    },
  })

  if (existing) {
    redirect(`/torneos/${id}/tarjetas/${existing.id}`)
  }

  const scorecard = await prisma.scorecard.create({
    data: {
      tournamentId: Number(id),
      playerId: Number(playerId),
      ronda: 1,
    },
  })

  redirect(`/torneos/${id}/tarjetas/${scorecard.id}`)
}
