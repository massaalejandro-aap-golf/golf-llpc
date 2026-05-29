/**
 * Exploración profunda de los endpoints de padrón/matriculados en AAG.
 * Hace login y extrae los datos de jugadores disponibles.
 */

import { chromium } from 'playwright'
import 'dotenv/config'
import { writeFileSync } from 'fs'

const USER     = process.env.AAG_USER
const PASSWORD = process.env.AAG_PASSWORD

async function login(page) {
  await page.goto('https://golf.org.ar/Home/Login', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => {
    const el = document.getElementById('captcha')
    return el && el.value && el.value.length > 10
  }, { timeout: 15000 }).catch(() => {})
  await page.fill('#user',     USER)
  await page.fill('#password', PASSWORD)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"], input[type="submit"]'),
  ])
  return page.url().includes('Admin')
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  console.log('🔑 Haciendo login...')
  const ok = await login(page)
  if (!ok) { console.error('❌ Login fallido'); await browser.close(); return }
  console.log('✅ Login OK\n')

  // ── 1. Enrolled By Club ──────────────────────────────────────────────────
  console.log('=== /Enrolled/EnrolledByClub ===')
  await page.goto('https://golf.org.ar/Enrolled/EnrolledByClub', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/padron-01-enrolled.png' })

  // Ver si hay tabla de datos
  const enrolledRows = await page.$$eval('table tbody tr', rows =>
    rows.slice(0, 5).map(r => r.innerText.replace(/\s+/g, ' ').trim())
  ).catch(() => [])
  console.log('Primeras filas:', enrolledRows)

  // Ver inputs/filtros disponibles
  const inputs = await page.$$eval('input, select', els =>
    els.map(e => ({ tag: e.tagName, name: e.name, id: e.id, type: e.type }))
  ).catch(() => [])
  console.log('Inputs:', inputs)

  // Ver si hay botón de exportar
  const exportBtns = await page.$$eval('a, button', els =>
    els.filter(e => /export|excel|csv|download|descargar/i.test(e.textContent + e.href))
       .map(e => ({ text: e.textContent.trim(), href: e.getAttribute('href'), onclick: e.getAttribute('onclick') }))
  ).catch(() => [])
  console.log('Botones export:', exportBtns)

  writeFileSync('scripts/padron-enrolled.html', await page.content())

  // ── 2. Report/Padron ─────────────────────────────────────────────────────
  console.log('\n=== /Report/Padron ===')
  await page.goto('https://golf.org.ar/Report/Padron', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/padron-02-report.png' })

  const padronInputs = await page.$$eval('input, select', els =>
    els.map(e => ({ tag: e.tagName, name: e.name, id: e.id, type: e.type, value: e.value }))
  ).catch(() => [])
  console.log('Inputs:', padronInputs)

  const padronBtns = await page.$$eval('a, button, input[type=submit]', els =>
    els.map(e => ({ text: e.textContent?.trim() || e.value, href: e.getAttribute('href'), onclick: e.getAttribute('onclick') }))
  ).catch(() => [])
  console.log('Botones:', padronBtns)

  writeFileSync('scripts/padron-report.html', await page.content())

  // ── 3. Report/ForEnrolled ─────────────────────────────────────────────────
  console.log('\n=== /Report/ForEnrolled ===')
  await page.goto('https://golf.org.ar/Report/ForEnrolled', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/padron-03-forenrolled.png' })

  const forEnrolledInputs = await page.$$eval('input, select', els =>
    els.map(e => ({ name: e.name, id: e.id, type: e.type, value: e.value }))
  ).catch(() => [])
  console.log('Inputs:', forEnrolledInputs)

  writeFileSync('scripts/padron-forenrolled.html', await page.content())

  // ── 4. Interceptar requests de API al navegar ─────────────────────────────
  console.log('\n=== Interceptando requests de datos ===')
  const apiCalls = []
  page.on('response', async (res) => {
    const url = res.url()
    const ct  = res.headers()['content-type'] || ''
    if (url.includes('golf.org.ar') && (ct.includes('json') || ct.includes('xml'))) {
      try {
        const body = await res.text()
        apiCalls.push({ url, status: res.status(), body: body.substring(0, 500) })
        console.log(`  📡 JSON/XML: ${url} [${res.status()}]`)
        console.log(`     ${body.substring(0, 200)}`)
      } catch {}
    }
  })

  // Recargar enrolled para capturar requests AJAX
  await page.goto('https://golf.org.ar/Enrolled/EnrolledByClub', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Ver si hay paginación/tabla con data endpoint
  const tableLinks = await page.$$eval('[data-url], [data-src], [ajax-url]', els =>
    els.map(e => e.dataset)
  ).catch(() => [])
  console.log('Data attributes:', tableLinks)

  if (apiCalls.length > 0) {
    writeFileSync('scripts/padron-api-calls.json', JSON.stringify(apiCalls, null, 2))
    console.log(`\n💾 ${apiCalls.length} llamadas API guardadas`)
  }

  await browser.close()
  console.log('\n✅ Exploración completa. Revisar scripts/padron-*.png y *.html')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
