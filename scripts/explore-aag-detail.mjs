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

  // ── 1. Ver detalle de un jugador ─────────────────────────────────────────
  console.log('=== /Enrolled/Detail/372 ===')
  await page.goto('https://golf.org.ar/Enrolled/Detail/372', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/detail-01-player.png' })

  // Extraer todos los campos del detalle
  const fields = await page.$$eval('dl dt, dl dd, .form-group label, .form-group .form-control-static, td', els =>
    els.map(e => e.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean)
  ).catch(() => [])
  console.log('Campos detalle jugador:', fields.slice(0, 40))
  writeFileSync('scripts/detail-player.html', await page.content())

  // ── 2. Ver todos los enrolled y sus IDs para saber cuántos hay ───────────
  console.log('\n=== /Enrolled/EnrolledByClub — conteo total ===')
  await page.goto('https://golf.org.ar/Enrolled/EnrolledByClub', { waitUntil: 'networkidle' })

  const totalRows = await page.$$eval('table tbody tr', rows => rows.length)
  console.log(`Total filas en tabla: ${totalRows}`)

  // Extraer todos los Detail links
  const detailLinks = await page.$$eval('a[href*="/Enrolled/Detail/"]', links =>
    links.map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim() }))
  )
  console.log(`Total Detail links: ${detailLinks.length}`)
  console.log('Primeros 5:', detailLinks.slice(0, 5))
  writeFileSync('scripts/detail-links.json', JSON.stringify(detailLinks, null, 2))

  // ── 3. Trigger export del Padrón ─────────────────────────────────────────
  console.log('\n=== /Report/Padron — intentando export ===')

  // Interceptar downloads
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)

  await page.goto('https://golf.org.ar/Report/Padron', { waitUntil: 'networkidle' })

  // Seleccionar el club en el dropdown si existe
  const clubSelect = await page.$('#cmbClubs')
  if (clubSelect) {
    await page.selectOption('#cmbClubs', '217')
    await page.waitForTimeout(1000)
    console.log('Club 217 seleccionado')
  }

  // Buscar y clickear el botón Export
  const exportBtn = await page.$('button:has-text("Export"), input[value*="Export"], a:has-text("Export")')
  if (exportBtn) {
    console.log('Clicking Export...')
    await exportBtn.click()
    const dl = await downloadPromise
    if (dl) {
      const path = `scripts/padron-export.${dl.suggestedFilename().split('.').pop()}`
      await dl.saveAs(path)
      console.log(`✅ Descargado: ${path}`)
    } else {
      console.log('No se detectó descarga')
    }
  } else {
    // Intentar trigger via JS
    console.log('Intentando trigger JS export...')
    await page.evaluate(() => {
      if (typeof exportarToprintDinamico === 'function') exportarToprintDinamico()
    }).catch(() => {})
    await page.waitForTimeout(2000)
  }

  await page.screenshot({ path: 'scripts/detail-02-padron.png' })

  // Ver si la página tiene tabla con datos después de buscar
  const padronRows = await page.$$eval('table tbody tr', rows =>
    rows.slice(0, 3).map(r => r.innerText.replace(/\s+/g, ' ').trim())
  ).catch(() => [])
  console.log('Filas padrón:', padronRows)

  // ── 4. Probar endpoint JSON para enrolled ────────────────────────────────
  console.log('\n=== Probando endpoints JSON ===')
  const jsonEndpoints = [
    '/Enrolled/GetEnrolledByClub',
    '/Enrolled/EnrolledByClubJson',
    '/Enrolled/List',
    '/Enrolled/GetAll',
    '/api/enrolled',
    '/Enrolled/GetEnrolledData',
  ]
  for (const ep of jsonEndpoints) {
    const res = await page.goto(`https://golf.org.ar${ep}`, { waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => null)
    const status = res?.status() ?? 'err'
    const url = page.url()
    if (!url.includes('Login') && status !== 404) {
      const body = await page.content()
      console.log(`  ✅ ${ep} → ${status}`)
      console.log(`     ${body.substring(0, 300)}`)
      writeFileSync(`scripts/endpoint${ep.replace(/\//g,'_')}.txt`, body)
    } else {
      console.log(`  ✗  ${ep} → ${status}`)
    }
  }

  await browser.close()
  console.log('\n✅ Listo')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
