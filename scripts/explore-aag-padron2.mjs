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
  await page.fill('#user', USER)
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
  console.log('🔑 Login...')
  await login(page)
  console.log('✅ OK\n')

  // ── POST a /Report/Padron con clubId=217 ─────────────────────────────────
  console.log('=== POST /Report/Padron con clubId=217 ===')
  await page.goto('https://golf.org.ar/Report/Padron', { waitUntil: 'networkidle' })

  // Setear el club
  await page.selectOption('#cmbClubs', '217')
  await page.waitForTimeout(1000)

  // Submit del formulario
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() =>
      page.waitForTimeout(3000)
    ),
    page.click('#submitBtn, button[type="submit"]'),
  ])

  await page.screenshot({ path: 'scripts/padron2-01-result.png' })
  const url2 = page.url()
  console.log('URL post-submit:', url2)

  // Extraer la tabla de resultados
  const headers = await page.$$eval('#Toprint th, table th', ths =>
    ths.map(th => th.textContent?.trim())
  ).catch(() => [])
  console.log('Headers tabla:', headers)

  const rows = await page.$$eval('#Toprint tbody tr, table tbody tr', rows =>
    rows.slice(0, 10).map(r =>
      Array.from(r.querySelectorAll('td')).map(td => td.textContent?.trim())
    )
  ).catch(() => [])
  console.log('Primeras 10 filas:')
  rows.forEach((r, i) => console.log(`  [${i+1}]`, r))

  const totalRows2 = await page.$$eval('#Toprint tbody tr, table tbody tr', r => r.length).catch(() => 0)
  console.log(`\nTotal filas: ${totalRows2}`)

  writeFileSync('scripts/padron2-result.html', await page.content())

  // ── También probar /Enrolled/Detail para ver datos de HCP ────────────────
  console.log('\n=== Enrolled Detail - buscando HCP via AJAX ===')

  // Interceptar requests AJAX
  const ajaxCalls = []
  page.on('response', async (res) => {
    const u = res.url()
    const ct = res.headers()['content-type'] || ''
    if (u.includes('golf.org.ar') && (ct.includes('json') || ct.includes('xml'))) {
      try {
        const body = await res.text()
        ajaxCalls.push({ url: u, body: body.substring(0, 800) })
        console.log(`  📡 ${u}`)
        console.log(`     ${body.substring(0, 400)}`)
      } catch {}
    }
  })

  await page.goto('https://golf.org.ar/Enrolled/Detail/372', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000) // esperar AJAX

  await page.screenshot({ path: 'scripts/padron2-02-detail.png' })

  // Intentar extraer valores visibles
  const visibleText = await page.evaluate(() => {
    const container = document.querySelector('.container, main, #content, .panel') || document.body
    return container.innerText.replace(/\s+/g, ' ').trim()
  }).catch(() => '')
  console.log('\nTexto visible en detail:', visibleText.substring(0, 500))

  if (ajaxCalls.length > 0) {
    writeFileSync('scripts/padron2-ajax.json', JSON.stringify(ajaxCalls, null, 2))
    console.log(`\n💾 ${ajaxCalls.length} AJAX calls guardadas`)
  }

  await browser.close()
  console.log('\n✅ Listo')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
