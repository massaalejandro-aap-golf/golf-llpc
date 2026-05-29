import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const Schema = z.object({
  torneoId:    z.number().int().positive(),
  jugadorId:   z.number().int().positive(),
  marcaPropia: z.boolean().default(true),
})

// POST /api/tarjeta-online/iniciar
// ronda=1 → tarjeta oficial de JUG (marcada por el marcador)
// ronda=2 → tarjeta de control YO (el marcador anota sus propios golpes, no se envía)
// Usar rondas distintas evita el conflicto de unique(tournamentId, playerId, ronda)
// cuando dos jugadores se marcan mutuamente.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.playerId) {
    return NextResponse.json({ error: 'No autenticado o sin jugador vinculado' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { torneoId, jugadorId, marcaPropia } = parsed.data
  const marcadorId = session.playerId

  const tieneReserva = await prisma.teeTimeSlotPlayer.findFirst({
    where: { playerId: marcadorId, teeTimeSlot: { tournamentId: torneoId } },
  })
  if (!tieneReserva && session.role === 'SOCIO') {
    return NextResponse.json({ error: 'No tenés reserva en este torneo' }, { status: 403 })
  }

  const torneo = await prisma.tournament.findUnique({
    where: { id: torneoId },
    select: { id: true },
  })
  if (!torneo) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })

  // Tarjeta oficial de JUG (ronda=1)
  const scJug = await prisma.scorecard.upsert({
    where: { tournamentId_playerId_ronda: { tournamentId: torneoId, playerId: jugadorId, ronda: 1 } },
    update: {},
    create: {
      tournamentId:     torneoId,
      playerId:         jugadorId,
      ronda:            1,
      origenOnline:     true,
      onlineEstado:     'SIENDO_CARGADA',
      marcadorPlayerId: marcadorId,
    },
  })

  // Tarjeta de control YO del marcador (ronda=2, mismo jugador=marcadorId)
  // Solo control — nunca se envía al torneo
  const scYo = marcaPropia && marcadorId !== jugadorId
    ? await prisma.scorecard.upsert({
        where: { tournamentId_playerId_ronda: { tournamentId: torneoId, playerId: marcadorId, ronda: 2 } },
        update: {},
        create: {
          tournamentId:     torneoId,
          playerId:         marcadorId,
          ronda:            2,
          origenOnline:     true,
          onlineEstado:     'SIENDO_CARGADA',
          marcadorPlayerId: marcadorId,
        },
      })
    : null

  return NextResponse.json({ jugScId: scJug.id, yoScId: scYo?.id ?? null })
}
