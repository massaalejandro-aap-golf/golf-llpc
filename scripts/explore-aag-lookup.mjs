import { chromium } from 'playwright'
import 'dotenv/config'

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
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()
  await login(page)
  console.log('✅ Login OK\n')

  // Obtener las cookies de sesión para hacer requests directos
  const cookies = await context.cookies()
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

  // ── 1. Probar /ScoreCard/GetEnrrolled ───────────────────────────────────
  console.log('=== GET /ScoreCard/GetEnrrolled?EnrolledId={matricula} ===')
  const testMatriculas = ['88730', '104890', '55699', '99999', '12345', '1', '100000']

  for (const mat of testMatriculas) {
    const res = await page.goto(
      `https://golf.org.ar/ScoreCard/GetEnrrolled?EnrolledId=${mat}`,
      { waitUntil: 'domcontentloaded' }
    )
    const body = await page.content()
    const text = body.replace(/<[^>]+>/g, '').trim()
    console.log(`  Mat ${mat}: [${res?.status()}] → "${text.substring(0, 150)}"`)
  }

  // ── 2. Enrolled/Search con nombre parcial ───────────────────────────────
  console.log('\n=== GET /Enrolled/Search?name=A — resultados y estructura ===')
  await page.goto('https://golf.org.ar/Enrolled/Search?name=A', { waitUntil: 'networkidle' })

  const rows = await page.$$eval('table tbody tr', rows =>
    rows.slice(0, 5).map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent?.trim()))
  ).catch(() => [])
  console.log('Primeras filas (name=A):', rows)

  const totalInfo = await page.$eval('#listCount, .total, [class*="total"], [class*="count"], small', e => e.textContent?.trim()).catch(() => '')
  console.log('Total info:', totalInfo)

  // Ver si hay paginación
  const pagination = await page.$$eval('.pagination a, [aria-label*="page"]', els =>
    els.map(e => ({ text: e.textContent?.trim(), href: e.getAttribute('href') }))
  ).catch(() => [])
  console.log('Paginación:', pagination)

  // Contar todas las filas
  const rowCount = await page.$$eval('table tbody tr', rows => rows.length).catch(() => 0)
  console.log('Filas en tabla:', rowCount)

  // ── 3. Enrolled/Search — buscar con número ──────────────────────────────
  console.log('\n=== GET /Enrolled/Search?name=88730 ===')
  await page.goto('https://golf.org.ar/Enrolled/Search?name=88730', { waitUntil: 'networkidle' })
  const rows2 = await page.$$eval('table tbody tr', rows =>
    rows.slice(0, 5).map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent?.trim()))
  ).catch(() => [])
  console.log('Resultado búsqueda por número:', rows2)

  // ── 4. Ver el header de la tabla de search ──────────────────────────────
  console.log('\n=== Headers tabla search ===')
  await page.goto('https://golf.org.ar/Enrolled/Search?name=Massa', { waitUntil: 'networkidle' })
  const headers = await page.$$eval('table thead th', ths => ths.map(th => th.textContent?.trim())).catch(() => [])
  console.log('Headers:', headers)
  const rows3 = await page.$$eval('table tbody tr', rows =>
    rows.map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent?.trim()))
  ).catch(() => [])
  console.log('Filas "Massa":', rows3)

  await browser.close()
  console.log('\n✅ Listo')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
