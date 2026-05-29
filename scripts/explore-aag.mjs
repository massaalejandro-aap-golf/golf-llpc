/**
 * Script de exploración del portal AAG (golf.org.ar)
 * Hace login con las credenciales del club y mapea los endpoints disponibles.
 *
 * Uso: node scripts/explore-aag.mjs
 * Requiere: AAG_USER y AAG_PASSWORD en .env
 */

import { chromium } from 'playwright'
import 'dotenv/config'
import { writeFileSync } from 'fs'

const USER     = process.env.AAG_USER
const PASSWORD = process.env.AAG_PASSWORD

if (!USER || !PASSWORD) {
  console.error('❌ Faltan AAG_USER y/o AAG_PASSWORD en .env')
  process.exit(1)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  // Colectar todas las requests para mapear endpoints
  const requests = []
  page.on('request',  (r) => requests.push({ method: r.method(), url: r.url() }))

  console.log('🌐 Abriendo login...')
  await page.goto('https://golf.org.ar/Home/Login', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/aag-01-login.png' })

  // Esperar a que reCAPTCHA v3 ejecute y llene el campo oculto
  console.log('⏳ Esperando reCAPTCHA...')
  await page.waitForFunction(() => {
    const el = document.getElementById('captcha')
    return el && el.value && el.value.length > 10
  }, { timeout: 15000 }).catch(() => console.log('⚠️  reCAPTCHA no llenó el campo (puede continuar igual)'))

  const captchaVal = await page.$eval('#captcha', el => el.value).catch(() => '')
  console.log(`🔐 Captcha token: ${captchaVal ? captchaVal.substring(0, 40) + '...' : '(vacío)'}`)

  // Llenar credenciales
  await page.fill('#user',     USER)
  await page.fill('#password', PASSWORD)

  console.log('🔑 Enviando login...')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"], input[type="submit"]'),
  ])

  const url = page.url()
  console.log(`📍 URL post-login: ${url}`)
  await page.screenshot({ path: 'scripts/aag-02-post-login.png' })

  if (url.includes('Login')) {
    // Verificar si hay mensaje de error
    const errText = await page.textContent('.text-danger, .alert, .error').catch(() => '')
    console.error('❌ Login fallido. Mensaje:', errText)
    await browser.close()
    return
  }

  console.log('✅ Login exitoso!')

  // Guardar cookies para reutilizar
  const cookies = await context.cookies()
  const aspxAuth = cookies.find(c => c.name === '.ASPXAUTH')
  console.log(`🍪 .ASPXAUTH: ${aspxAuth ? aspxAuth.value.substring(0, 40) + '...' : 'no encontrada'}`)
  writeFileSync('scripts/aag-cookies.json', JSON.stringify(cookies, null, 2))

  // Explorar la navegación disponible
  console.log('\n📋 Explorando links disponibles...')
  const links = await page.$$eval('a[href]', els =>
    els.map(e => ({ text: e.textContent?.trim(), href: e.getAttribute('href') }))
       .filter(l => l.href && !l.href.startsWith('#') && !l.href.startsWith('http'))
  )
  const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()]
  console.log('Links internos:')
  uniqueLinks.forEach(l => console.log(`  ${l.href.padEnd(50)} ${l.text}`))

  // Buscar sección de jugadores / padrón / handicap
  const playerLinks = uniqueLinks.filter(l =>
    /jugador|socio|padr|handicap|miembro|club/i.test(l.text + l.href)
  )
  console.log('\n🎯 Links relevantes (jugadores/HCP):')
  playerLinks.forEach(l => console.log(`  ${l.href.padEnd(50)} ${l.text}`))

  // Navegar a cada link relevante y capturar
  for (const link of playerLinks.slice(0, 5)) {
    try {
      console.log(`\n→ Explorando: ${link.href}`)
      await page.goto(`https://golf.org.ar${link.href}`, { waitUntil: 'networkidle', timeout: 10000 })
      const slug = link.href.replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      await page.screenshot({ path: `scripts/aag-page-${slug}.png` })
      const pageUrl = page.url()
      console.log(`  URL: ${pageUrl}`)
    } catch (e) {
      console.log(`  ⚠️  Error: ${e.message}`)
    }
  }

  // Intentar URLs conocidas para exportar datos
  console.log('\n🔍 Probando endpoints de datos...')
  const testUrls = [
    '/Jugadores',
    '/Jugadores/Index',
    '/Jugadores/Lista',
    '/Handicap',
    '/Handicap/Lista',
    '/Club/Jugadores',
    '/Club/Padron',
    '/Api/Jugadores',
    '/api/jugadores',
    '/Exportar/Jugadores',
    '/Reportes/Jugadores',
  ]
  for (const path of testUrls) {
    const res = await page.goto(`https://golf.org.ar${path}`, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => null)
    const status = res?.status() ?? 'err'
    const finalUrl = page.url()
    if (status !== 404 && !finalUrl.includes('Login')) {
      console.log(`  ✅ ${path} → ${status} → ${finalUrl}`)
      await page.screenshot({ path: `scripts/aag-endpoint${path.replace(/\//g, '_')}.png` })
    } else {
      console.log(`  ✗  ${path} → ${status}`)
    }
  }

  // Guardar resumen de requests
  const apiRequests = requests.filter(r => r.url.includes('golf.org.ar') && !r.url.match(/\.(css|js|png|ico|woff)/))
  writeFileSync('scripts/aag-requests.json', JSON.stringify(apiRequests, null, 2))
  console.log(`\n📊 ${apiRequests.length} requests capturadas → scripts/aag-requests.json`)

  await browser.close()
  console.log('\n✅ Exploración completa. Revisar screenshots en scripts/')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
