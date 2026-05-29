/**
 * Debug script — dumps raw HTML from search + detail pages for matricula 88730
 * Run: npx tsx --env-file=.env scripts/debug-html.ts
 */

import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'

const AAG_URL   = 'https://golf.org.ar'
const DATA_DIR  = path.join(process.cwd(), 'data')
const SESSION_FILE = path.join(DATA_DIR, 'aag-session.json')

async function aagFetch(url: string): Promise<Response> {
  const session = JSON.parse(await readFile(SESSION_FILE, 'utf-8'))
  return fetch(url, {
    headers: {
      'Cookie':     session.cookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer':    AAG_URL,
    },
    redirect: 'follow',
  })
}

async function main() {
  const MAT = '88730'

  // 1. Search page
  const searchUrl = `${AAG_URL}/Enrolled/Search?name=${MAT}`
  console.log(`Fetching: ${searchUrl}`)
  const searchRes = await aagFetch(searchUrl)
  const searchHtml = await searchRes.text()
  console.log(`Status: ${searchRes.status}, URL: ${searchRes.url}`)
  await mkdir('scripts/debug', { recursive: true })
  await writeFile('scripts/debug/search.html', searchHtml)
  console.log('Saved: scripts/debug/search.html')

  // Find the row for our matricula
  const rowPattern = /<tr[^>]*class="grid-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  let match: RegExpExecArray | null
  while ((match = rowPattern.exec(searchHtml)) !== null) {
    const rowHtml = match[1]
    const numMatch = rowHtml.match(/data-name="EnrollmentNumber"[^>]*>(\d+)</)
    if (numMatch?.[1] === MAT) {
      console.log('\n=== Row HTML ===')
      console.log(rowHtml)
      console.log('\n=== Decommission field ===')
      const decomMatch = rowHtml.match(/data-name="Decommission"[^>]*>([^<]+)</)
      console.log('decomMatch:', decomMatch?.[1])
      break
    }
  }

  // Try alternative patterns
  console.log('\n=== Checking for "Active" / "Activo" in search HTML ===')
  const activeHits = searchHtml.match(/Active|Activo|Inactive|Dado de baja|Baja/gi)
  console.log('Hits:', [...new Set(activeHits ?? [])])

  // Get data-name attributes present
  const dataNames = [...new Set((searchHtml.match(/data-name="([^"]+)"/g) ?? []))]
  console.log('\n=== data-name attrs in search ===')
  console.log(dataNames)

  // 2. Now try to find internal ID and check detail
  // Re-run pattern from scratch
  const rowPattern2 = /<tr[^>]*class="grid-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  let internalId: number | null = null
  let matchR: RegExpExecArray | null
  while ((matchR = rowPattern2.exec(searchHtml)) !== null) {
    const rowHtml = matchR[1]
    const numMatch = rowHtml.match(/data-name="EnrollmentNumber"[^>]*>(\d+)</)
    if (numMatch?.[1] === MAT) {
      const m = rowHtml.match(/Redireccionar\((\d+)\s*\+\s*':'/i)
      internalId = m ? parseInt(m[1]) : null
      console.log('\n=== Internal ID ===', internalId)
      console.log('Full Redireccionar match:', rowHtml.match(/Redireccionar[^)]+\)/)?.[0])
      break
    }
  }

  if (internalId) {
    const detailUrl = `${AAG_URL}/Enrolled/Detail?Id=${internalId}`
    console.log(`\nFetching: ${detailUrl}`)
    const detailRes = await aagFetch(detailUrl)
    const detailHtml = await detailRes.text()
    console.log(`Status: ${detailRes.status}`)
    await writeFile('scripts/debug/detail.html', detailHtml)
    console.log('Saved: scripts/debug/detail.html')

    // Find item-handicap panels
    const hcpPanelPattern = /class="item-handicap"[^>]*>([\s\S]*?)(?=class="item-handicap"|<\/div>\s*<\/div>)/gi
    let hcpMatch: RegExpExecArray | null
    let found = 0
    while ((hcpMatch = hcpPanelPattern.exec(detailHtml)) !== null) {
      found++
      const panelHtml = hcpMatch[1]
      console.log(`\n=== HCP Panel ${found} ===`)
      const plainText = panelHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      console.log(plainText.trim())
      const hasTitle = /fieldTitle[^>]*>Handicap Index</i.test(panelHtml)
      console.log('Has "Handicap Index" title:', hasTitle)
    }
    console.log(`Total item-handicap panels found: ${found}`)

    // Also look for handicap with different patterns
    console.log('\n=== All text near "handicap" in detail ===')
    const hcpRaw = detailHtml.match(/.{0,100}[Hh]andicap.{0,100}/g) ?? []
    hcpRaw.forEach(h => console.log(h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
  }
}

main().catch(e => { console.error(e); process.exit(1) })
