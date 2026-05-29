/**
 * GET /api/aag/matricula?id=XXXXX
 *
 * Busca un jugador por matrícula.
 * 1. Primero busca en la DB local.
 * 2. Si no está, hace lookup en golf.org.ar usando la sesión cacheada (lib/aag-sync).
 *
 * Respuesta:
 *   { playerId, matricula, nombre, apellido, hcpIndex, genero, club, activo }
 *   playerId = null si el jugador no está registrado en la DB local todavía.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { lookupByMatricula } from '@/lib/aag-sync'

export type MatriculaResult = {
  playerId:  number | null
  matricula: string
  nombre:    string
  apellido:  string
  hcpIndex:  number | null
  genero:    'DAMA' | 'CABALLERO'
  club:      string | null
  activo:    boolean
  // Campos adicionales disponibles cuando el jugador ya está en DB
  dni:       string | null
  fechaNac:  string | null
  email:     string | null
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const matricula = new URL(req.url).searchParams.get('id')?.trim() ?? ''
  if (!matricula || !/^\d{3,8}$/.test(matricula)) {
    return NextResponse.json({ error: 'Matrícula inválida — debe ser numérica (3-8 dígitos)' }, { status: 400 })
  }

  // ── 1. Buscar en DB local ─────────────────────────────────────────────────
  const dbPlayer = await prisma.player.findUnique({
    where: { matricula },
    select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true, dni: true, fechaNac: true, email: true },
  })

  if (dbPlayer) {
    return NextResponse.json({
      playerId:  dbPlayer.id,
      matricula,
      nombre:    dbPlayer.nombre,
      apellido:  dbPlayer.apellido,
      hcpIndex:  dbPlayer.hcpIndex,
      genero:    dbPlayer.genero,
      club:      null,
      activo:    true,
      dni:       dbPlayer.dni,
      fechaNac:  dbPlayer.fechaNac ? dbPlayer.fechaNac.toISOString().slice(0, 10) : null,
      email:     dbPlayer.email,
    } satisfies MatriculaResult)
  }

  // ── 2. Lookup en AAG ──────────────────────────────────────────────────────
  try {
    const info = await lookupByMatricula(matricula)
    if (!info) {
      return NextResponse.json({ error: `Matrícula ${matricula} no encontrada en el padrón AAG` }, { status: 404 })
    }
    return NextResponse.json({
      playerId:  null,
      matricula: info.matricula,
      nombre:    info.nombre,
      apellido:  info.apellido,
      hcpIndex:  info.hcpIndex,
      genero:    info.genero,
      club:      info.club,
      activo:    info.activo,
      dni:       null,
      fechaNac:  null,
      email:     null,
    } satisfies MatriculaResult)
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
