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

  // Interceptar toda respuesta JSON
  const jsonResponses = []
  page.on('response', async res => {
    const ct = res.headers()['content-type'] || ''
    const u  = res.url()
    if (u.includes('golf.org.ar') && (ct.includes('json') || ct.includes('javascript'))) {
      try {
        const body = await res.text()
        if (body.trim().startsWith('[') || body.trim().startsWith('{')) {
          jsonResponses.push({ url: u, body: body.substring(0, 2000) })
          console.log(`📡 JSON: ${u}`)
          console.log(`   ${body.substring(0, 400)}\n`)
        }
      } catch {}
    }
  })

  console.log('🔑 Login...')
  await login(page)
  console.log('✅ OK\n')

  // ── 1. Enrolled/Search con búsqueda vacía ──────────────────────────────
  console.log('=== /Enrolled/Search — inputs disponibles ===')
  await page.goto('https://golf.org.ar/Enrolled/Search', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/search-01.png' })

  const inputs = await page.$$eval('input, select', els =>
    els.map(e => ({ name: e.name, id: e.id, type: e.type, placeholder: e.placeholder, value: e.value }))
       .filter(e => e.type !== 'hidden' || e.name.includes('Token') === false)
  )
  console.log('Inputs:', JSON.stringify(inputs, null, 2))

  const forms = await page.$$eval('form', fs => fs.map(f => ({ action: f.action, method: f.method })))
  console.log('Forms:', forms)

  // Submitear con búsqueda vacía para ver todos
  console.log('\n→ Buscando con criteria vacía...')
  const submitBtn = await page.$('button[type="submit"], input[type="submit"], #btnSearch, #submitBtn')
  if (submitBtn) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => page.waitForTimeout(3000)),
      submitBtn.click(),
    ])
    await page.screenshot({ path: 'scripts/search-02-results.png' })

    const rows = await page.$$eval('table tbody tr', rows =>
      rows.slice(0, 5).map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent?.trim()))
    )
    console.log('Primeras filas:', rows)

    const totalText = await page.$eval('.pagination, [class*="total"], [class*="count"]', el => el.textContent?.trim()).catch(() => '')
    console.log('Paginación/total:', totalText)

    writeFileSync('scripts/search-results.html', await page.content())
  }

  // ── 2. Report/ForEnrolled — buscar por matrícula específica ────────────
  console.log('\n=== /Report/ForEnrolled — buscar por matrícula 88730 ===')
  await page.goto('https://golf.org.ar/Report/ForEnrolled', { waitUntil: 'networkidle' })

  // Llenar matrícula
  await page.fill('#enrolledNumber', '88730').catch(() => {})

  const submitBtn2 = await page.$('button[type="submit"], input[type="submit"]')
  if (submitBtn2) {
    await submitBtn2.click()
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'scripts/search-03-forenrolled.png' })

    const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim())
    console.log('Resultado For Enrolled:', text.substring(0, 500))
    writeFileSync('scripts/search-forenrolled.html', await page.content())
  }

  // ── 3. Probar paginación / endpoint AJAX del search ────────────────────
  console.log('\n=== Probando endpoints de search AJAX ===')
  const ajaxEndpoints = [
    '/Enrolled/GetAll',
    '/Enrolled/GetEnrolled',
    '/Enrolled/Search?page=1',
    '/Enrolled/SearchJson',
    '/api/Enrolled',
    '/Enrolled/GetByNumber/88730',
    '/Enrolled/GetEnrolledByNumber?number=88730',
  ]
  for (const ep of ajaxEndpoints) {
    const res = await page.goto(`https://golf.org.ar${ep}`, { waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => null)
    const status = res?.status() ?? 'err'
    const url = page.url()
    const ct = res?.headers()['content-type'] || ''
    if (!url.includes('Login') && status !== 404 && status !== 'err') {
      const body = (await page.content()).substring(0, 300)
      console.log(`  ✅ ${ep} → ${status} (${ct.split(';')[0]})`)
      console.log(`     ${body.replace(/<[^>]+>/g,'').trim().substring(0, 200)}`)
    } else {
      console.log(`  ✗  ${ep} → ${status}`)
    }
  }

  if (jsonResponses.length) {
    writeFileSync('scripts/search-json.json', JSON.stringify(jsonResponses, null, 2))
  }

  await browser.close()
  console.log('\n✅ Listo')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
