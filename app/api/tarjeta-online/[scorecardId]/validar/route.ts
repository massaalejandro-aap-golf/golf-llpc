import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Ctx = { params: Promise<{ scorecardId: string }> }

// POST /api/tarjeta-online/[scorecardId]/validar — admin valida (VALIDADA)
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMISION')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { scorecardId } = await params
  await prisma.scorecard.update({
    where: { id: Number(scorecardId) },
    data: { onlineEstado: 'VALIDADA' },
  })

  return NextResponse.json({ ok: true })
}
