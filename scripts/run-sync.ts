/**
 * run-sync.ts — runner del sync AAG, ejecutable con tsx
 *
 * Uso en dev/servidor:
 *   npx tsx --env-file=.env scripts/run-sync.ts
 *
 * Como cron (viernes 6am):
 *   0 6 * * 5 cd /ruta && npx tsx --env-file=.env scripts/run-sync.ts >> logs/aag.log 2>&1
 */

import { runAagSync } from '../lib/aag-sync'

async function main() {
  console.log(`\n[${new Date().toISOString()}] === AAG Sync iniciado ===\n`)

  const result = await runAagSync()

  console.log(`\n[${new Date().toISOString()}] Finalizado: ${result.status}`)
  console.log(`  Actualizados:     ${result.updated}`)
  console.log(`  No encontrados:   ${result.notFound}`)
  console.log(`  Inactivos:        ${result.skipped}`)
  console.log(`  Errores:          ${result.errors}`)
  console.log(`  ${result.message}`)

  process.exit(result.status === 'error' ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
