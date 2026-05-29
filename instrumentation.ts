/**
 * instrumentation.ts — se ejecuta una sola vez al iniciar el servidor Next.js.
 * Registra el cron de sync AAG: todos los viernes a las 6:00 AM (hora Argentina, UTC-3).
 */

export async function register() {
  // Solo correr en el proceso del servidor Node.js, no en el edge runtime
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const cron = await import('node-cron')
  const { runAagSync } = await import('@/lib/aag-sync')

  // Viernes 6:00 AM hora Argentina (UTC-3) = 9:00 AM UTC
  // Cron: minuto hora día mes díaSemana
  // 5 = viernes en cron (0=dom, 1=lun, ..., 5=vie, 6=sáb)
  const schedule = '0 9 * * 5'

  cron.schedule(schedule, async () => {
    console.log(`[Cron AAG] Iniciando sync automático — ${new Date().toISOString()}`)
    try {
      const result = await runAagSync()
      console.log(`[Cron AAG] Sync completado: ${result.message}`)
    } catch (e) {
      console.error('[Cron AAG] Error en sync automático:', e instanceof Error ? e.message : String(e))
    }
  }, {
    timezone: 'America/Argentina/Buenos_Aires',
  })

  console.log('[Cron AAG] Scheduled: viernes 6:00 AM hora Argentina')
}
