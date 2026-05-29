import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

// PUT /api/ajustes/canchas/[id]/tees/[teeId]/yardas
// Body: { hoyos: [{ holeId: number, yardas: number | null }] }
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string; teeId: string }> }) {
  const s = await getSession()
  if (!s || (s.role !== 'ADMIN' && s.role !== 'COMISION'))
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { teeId } = await props.params
  const body = z.object({
    hoyos: z.array(z.object({
      holeId: z.number().int(),
      yardas: z.number().int().min(0).max(700).nullable(),
    })),
  }).safeParse(await req.json())

  if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  // Upsert each hole distance
  await Promise.all(
    body.data.hoyos.map((h) =>
      prisma.courseTeeHole.upsert({
        where:  { teeId_holeId: { teeId: Number(teeId), holeId: h.holeId } },
        update: { yardas: h.yardas },
        create: { teeId: Number(teeId), holeId: h.holeId, yardas: h.yardas },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
