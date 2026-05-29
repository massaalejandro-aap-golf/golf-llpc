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
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()
  await login(page)
  console.log('✅ Login OK\n')

  // ── 1. Search específico — ver headers y si tiene HCP ─────────────────
  console.log('=== Search por apellido "Massa" ===')
  await page.goto('https://golf.org.ar/Enrolled/Search?name=Massa', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)

  const headers = await page.$$eval('table thead th', ths => ths.map(th => th.textContent?.trim())).catch(() => [])
  console.log('Headers:', headers)

  const rows = await page.$$eval('table tbody tr', rows =>
    rows.map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent?.trim()))
  ).catch(() => [])
  console.log('Filas:', rows)

  writeFileSync('scripts/search2-massa.html', await page.content())

  // ── 2. Search por número de matrícula ────────────────────────────────
  console.log('\n=== Search por matrícula "88730" ===')
  await page.goto('https://golf.org.ar/Enrolled/Search?name=88730', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(2000)

  const rows2 = await page.$$eval('table tbody tr', rows =>
    rows.map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent?.trim()))
  ).catch(() => [])
  console.log('Búsqueda por número:', rows2)

  // ── 3. Detail de un jugador externo (matrícula 100000) ───────────────
  // Primero obtener su ID interno via search
  console.log('\n=== Detail de matricula 100000 (ALVAREZ ALEX RUBEN) ===')
  await page.goto('https://golf.org.ar/Enrolled/Search?name=ALVAREZ%20ALEX', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(2000)

  const rows3 = await page.$$eval('table tbody tr', rows =>
    rows.map(r => {
      const cells = Array.from(r.querySelectorAll('td')).map(td => td.textContent?.trim())
      const link = r.querySelector('a, select')?.getAttribute('href') || ''
      return { cells, link }
    })
  ).catch(() => [])
  console.log('Resultado ALVAREZ ALEX:', JSON.stringify(rows3.slice(0,3), null,2))

  // ── 4. Intentar el detail directo con ?Id= (no /id/) ────────────────
  console.log('\n=== /Enrolled/Detail?Id=372 ===')
  await page.goto('https://golf.org.ar/Enrolled/Detail?Id=372', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
  const url = page.url()
  console.log('URL:', url)
  const hcpText = await page.$eval('.item-handicap', el => el.innerText?.replace(/\s+/g,' ').trim()).catch(() => '')
  console.log('HCP panel:', hcpText)

  // ── 5. Enrolled/AppEnrolled — puede ser el endpoint mobile/API ───────
  console.log('\n=== /Enrolled/AppEnrolled ===')
  await page.goto('https://golf.org.ar/Enrolled/AppEnrolled', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(1000)
  const appText = await page.evaluate(() => document.body.innerText.replace(/\s+/g,' ').trim())
  console.log('AppEnrolled:', appText.substring(0, 400))

  // ── 6. Buscar endpoint que retorne JSON con HCP ───────────────────────
  console.log('\n=== Probando endpoints JSON con HCP ===')
  const endpoints = [
    '/Enrolled/GetHandicapIndex?enrolledId=88730',
    '/Enrolled/GetHandicapIndex/88730',
    '/Enrolled/HandicapIndex?number=88730',
    '/Enrolled/GetCurrentHI?enrolledNumber=88730',
    '/ScoreCard/GetEnrrolledData?EnrolledId=88730',
    '/ScoreCard/GetEnrrolled?EnrolledId=88730&includeHcp=true',
    '/Enrolled/GetEnrolledInfo?number=88730',
    '/Enrolled/GetByNumber?number=88730',
  ]
  for (const ep of endpoints) {
    const res = await page.goto(`https://golf.org.ar${ep}`, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => null)
    const status = res?.status() ?? 'err'
    const url = page.url()
    if (!url.includes('Login') && status !== 404) {
      const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g,' ').trim())
      console.log(`  ✅ ${ep} → ${status}`)
      console.log(`     "${body.substring(0,200)}"`)
    } else {
      console.log(`  ✗  ${ep} → ${status}`)
    }
  }

  await browser.close()
  console.log('\n✅ Listo')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
