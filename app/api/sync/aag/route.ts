import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runAagSync, readSyncStatus } from '@/lib/aag-sync'

async function canSync() {
  const s = await getSession()
  return s?.role === 'ADMIN'
}

// GET /api/sync/aag — estado del último sync
export async function GET() {
  const status = await readSyncStatus()
  return NextResponse.json(status)
}

// POST /api/sync/aag — disparar sync (ADMIN o cron con CRON_SECRET)
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isCron && !await canSync())
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  // Verificar que no esté ya corriendo
  // Si lleva más de 10 minutos en "running", probablemente crasheó → resetear
  const current = await readSyncStatus()
  if (current.status === 'running') {
    const stuckMs = current.lastSync
      ? Date.now() - new Date(current.lastSync).getTime()
      : Infinity
    const isStuck = stuckMs > 10 * 60 * 1000 // 10 minutos
    if (!isStuck) {
      return NextResponse.json({ error: 'Ya hay un sync en curso' }, { status: 409 })
    }
    // Estaba colgado — lo dejamos continuar (se va a sobrescribir el status al iniciar)
    console.log('[Sync] Estado "running" stale detectado, reiniciando…')
  }

  // En producción/servidor el sync corre sincrónicamente en la request.
  // Si el timeout del servidor es limitado, mover a un proceso separado.
  try {
    const result = await runAagSync()
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
