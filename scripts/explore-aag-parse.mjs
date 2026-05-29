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

  // Ir al primer enrolled y capturar HTML completo + estructura real
  await page.goto('https://golf.org.ar/Enrolled/Detail/372', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  // Guardar HTML con datos cargados
  const html = await page.content()
  writeFileSync('scripts/parse-detail-372.html', html)

  // Extraer todos los input fields con su valor
  const inputs = await page.$$eval('input, select', els =>
    els.map(e => ({
      name:  e.name,
      id:    e.id,
      type:  e.type,
      value: e.value,
      readonly: e.readOnly,
    })).filter(e => e.value && e.type !== 'hidden')
  )
  console.log('Input fields con valores:')
  inputs.forEach(i => console.log(' ', JSON.stringify(i)))

  // Labels y sus valores asociados
  const labels = await page.$$eval('label', els =>
    els.map(e => ({
      text: e.textContent?.trim(),
      for:  e.htmlFor,
    }))
  )
  console.log('\nLabels:', labels)

  // Todos los .form-control-static (valores de solo lectura en Bootstrap)
  const statics = await page.$$eval('.form-control-static, [readonly]', els =>
    els.map(e => ({ tag: e.tagName, value: e.value || e.textContent?.trim() }))
  )
  console.log('\nForm-control-static / readonly:', statics)

  // Ver los nodos span con texto de handicap
  const spans = await page.$$eval('span, strong, b, h3, h4', els =>
    els.map(e => e.textContent?.trim()).filter(t => t && t.length < 100)
  )
  console.log('\nSpans/headings:', spans.filter(s => /\d/.test(s)).slice(0, 30))

  // Ver estructura del panel de handicap
  const hcpPanel = await page.evaluate(() => {
    // Buscar elementos que contengan "Handicap"
    const all = Array.from(document.querySelectorAll('*'))
    return all
      .filter(e => e.children.length === 0 && /handicap/i.test(e.textContent))
      .map(e => ({
        tag: e.tagName,
        class: e.className,
        text: e.textContent.trim(),
        parent: e.parentElement?.className,
      }))
      .slice(0, 20)
  })
  console.log('\nElementos con "handicap":')
  hcpPanel.forEach(e => console.log(' ', JSON.stringify(e)))

  await browser.close()
}

main().catch(e => { console.error('❌', e); process.exit(1) })
