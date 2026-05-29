/**
 * sync-aag.mjs — runner standalone para el cron de los viernes.
 *
 * Uso:
 *   node scripts/sync-aag.mjs
 *
 * Cron (viernes 6am):
 *   0 6 * * 5 cd /ruta/al/proyecto && node scripts/sync-aag.mjs >> logs/aag-sync.log 2>&1
 */

import 'dotenv/config'

// Importar directamente el módulo compilado
// Nota: requiere que `next build` esté hecho o usar tsx/ts-node en dev
// En dev: npx tsx scripts/sync-aag.mjs (si tsx está disponible)

const { runAagSync } = await import('../lib/aag-sync.js').catch(async () => {
  // Fallback: require via módulo TS con tsx
  const { runAagSync } = await import('../lib/aag-sync.ts')
  return { runAagSync }
})

console.log(`\n[${new Date().toISOString()}] === AAG Sync iniciado ===`)

try {
  const result = await runAagSync()
  console.log(`[${new Date().toISOString()}] Resultado: ${result.status}`)
  console.log(`  Actualizados: ${result.updated}`)
  console.log(`  No encontrados: ${result.notFound}`)
  console.log(`  Inactivos: ${result.inactive}`)
  console.log(`  Errores: ${result.errors}`)
  console.log(`  ${result.message}`)
  process.exit(result.status === 'error' ? 1 : 0)
} catch (e) {
  console.error(`[${new Date().toISOString()}] Error fatal:`, e)
  process.exit(1)
}
