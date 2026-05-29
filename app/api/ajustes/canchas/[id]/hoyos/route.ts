import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const HoyoSchema = z.object({
  numero:             z.number().int().min(1).max(18),
  par:                z.number().int().min(3).max(5),
  parDamas:           z.number().int().min(3).max(5).nullable().optional(),
  handicapIndex:      z.number().int().min(1).max(18),
  handicapIndexDamas: z.number().int().min(1).max(18).nullable().optional(),
})

const BodySchema = z.object({
  hoyos: z.array(HoyoSchema).min(1),
})

async function canEdit() {
  const s = await getSession()
  return s && (s.role === 'ADMIN' || s.role === 'COMISION')
}

// PUT /api/ajustes/canchas/[id]/hoyos — upsert todos los hoyos de la cancha
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!await canEdit()) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { id } = await props.params
  const courseId = Number(id)

  const body = BodySchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Datos inválidos', issues: body.error.issues }, { status: 400 })

  await Promise.all(
    body.data.hoyos.map((h) =>
      prisma.hole.upsert({
        where:  { courseId_numero: { courseId, numero: h.numero } },
        update: {
          par:                h.par,
          parDamas:           h.parDamas ?? null,
          handicapIndex:      h.handicapIndex,
          handicapIndexDamas: h.handicapIndexDamas ?? null,
        },
        create: {
          courseId,
          numero:             h.numero,
          par:                h.par,
          parDamas:           h.parDamas ?? null,
          handicapIndex:      h.handicapIndex,
          handicapIndexDamas: h.handicapIndexDamas ?? null,
        },
      })
    )
  )

  const hoyos = await prisma.hole.findMany({
    where:   { courseId },
    orderBy: { numero: 'asc' },
  })
  return NextResponse.json(hoyos)
}
