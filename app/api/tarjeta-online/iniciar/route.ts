import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const Schema = z.object({
  torneoId:     z.number().int().positive(),
  jugadorId:    z.number().int().positive(), // JUG: al que le lleva la tarjeta
  marcaPropia:  z.boolean().default(true),   // también crea tarjeta para YO
})

// POST /api/tarjeta-online/iniciar
// Crea las scorecards online (JUG + opcionalmente YO) y las devuelve.
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

  // Verificar que el SOCIO tiene reserva en este torneo
  const tieneReserva = await prisma.teeTimeSlotPlayer.findFirst({
    where: { playerId: marcadorId, teeTimeSlot: { tournamentId: torneoId } },
  })
  if (!tieneReserva && session.role === 'SOCIO') {
    return NextResponse.json({ error: 'No tenés reserva en este torneo' }, { status: 403 })
  }

  // Verificar que el torneo existe y tiene tee definido
  const torneo = await prisma.tournament.findUnique({
    where: { id: torneoId },
    select: { id: true, nombre: true, teeHombreId: true, teeDamaId: true, hoyos: true },
  })
  if (!torneo) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })

  async function getOrCreateScorecard(playerId: number, marcadorPlayerId: number) {
    // Para la tarjeta propia (YO), buscamos específicamente la self-marked
    const whereClause = playerId === marcadorPlayerId
      ? { tournamentId_playerId_ronda: { tournamentId: torneoId, playerId, ronda: 1 } }
      : { tournamentId_playerId_ronda: { tournamentId: torneoId, playerId, ronda: 1 } }

    const existing = await prisma.scorecard.findFirst({
      where: {
        tournamentId: torneoId,
        playerId,
        ronda: 1,
        // Para YO (self-marked), buscar específicamente la que el jugador se marcó a sí mismo
        ...(playerId === marcadorPlayerId ? { marcadorPlayerId: playerId } : {}),
      },
    })
    if (existing) return existing

    return prisma.scorecard.create({
      data: {
        tournamentId:     torneoId,
        playerId,
        ronda:            1,
        origenOnline:     true,
        onlineEstado:     'SIENDO_CARGADA',
        marcadorPlayerId,
      },
    })
  }

  const scJug = await getOrCreateScorecard(jugadorId, marcadorId)
  // La tarjeta YO es la del marcador marcándose a sí mismo — control personal, nunca se envía
  const scYo  = marcaPropia && marcadorId !== jugadorId
    ? await getOrCreateScorecard(marcadorId, marcadorId)
    : null

  return NextResponse.json({ jugScId: scJug.id, yoScId: scYo?.id ?? null })
}
