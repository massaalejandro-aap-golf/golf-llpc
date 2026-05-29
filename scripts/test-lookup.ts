/**
 * Quick test for lookupByMatricula with an external club player
 * Run: npx tsx --env-file=.env scripts/test-lookup.ts
 */

import { lookupByMatricula } from '../lib/aag-sync'

async function main() {
  // ALVAREZ ALEX RUBEN — confirmed to exist in AAG, NOT a La Lucila member
  console.log('=== Test lookupByMatricula("100000") ===')
  const r1 = await lookupByMatricula('100000')
  console.log(JSON.stringify(r1, null, 2))

  // Also test with one of our own members as a sanity check
  console.log('\n=== Test lookupByMatricula("88730") ===')
  const r2 = await lookupByMatricula('88730')
  console.log(JSON.stringify(r2, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
