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
  console.log('🔑 Login...')
  await login(page)
  console.log('✅ OK\n')

  // Capturar TODOS los requests a golf.org.ar
  const allRequests = []
  const allResponses = []

  page.on('request', req => {
    const u = req.url()
    if (u.includes('golf.org.ar') && !u.match(/\.(css|js|png|ico|woff|jpg)/)) {
      allRequests.push({ method: req.method(), url: u, postData: req.postData() })
    }
  })

  page.on('response', async res => {
    const u = res.url()
    const ct = res.headers()['content-type'] || ''
    if (u.includes('golf.org.ar') && !u.match(/\.(css|js|png|ico|woff|jpg)/)) {
      try {
        const body = await res.text()
        allResponses.push({ url: u, status: res.status(), ct, body: body.substring(0, 1000) })
        if (ct.includes('json') || (body.trim().startsWith('[') || body.trim().startsWith('{'))) {
          console.log(`📡 JSON: ${u} [${res.status()}]`)
          console.log(`   ${body.substring(0, 300)}\n`)
        }
      } catch {}
    }
  })

  // ── 1. Padron con submit correcto ────────────────────────────────────────
  console.log('=== /Report/Padron — submit + esperar AJAX ===')
  await page.goto('https://golf.org.ar/Report/Padron', { waitUntil: 'networkidle' })

  // Seleccionar club
  await page.selectOption('#cmbClubs', '217')
  await page.waitForTimeout(500)

  // Verificar que clubId se actualizó
  const clubIdVal = await page.$eval('#clubId', e => e.value).catch(() => 'not found')
  console.log('clubId value:', clubIdVal)

  // Si no se actualizó, forzarlo
  if (clubIdVal !== '217') {
    await page.evaluate(() => { document.getElementById('clubId').value = '217' })
    console.log('clubId forzado a 217')
  }

  // Submitear y esperar respuesta
  console.log('Submiteando...')
  await page.click('#submitBtn, button[type="submit"]')
  await page.waitForTimeout(5000) // esperar que cargue el AJAX

  await page.screenshot({ path: 'scripts/ajax-01-padron.png' })

  // Extraer la tabla del Toprint
  const toPrintText = await page.evaluate(() => {
    const el = document.getElementById('Toprint')
    return el ? el.innerText : 'No se encontró #Toprint'
  })
  console.log('\n#Toprint contenido:', toPrintText.substring(0, 1000))

  // También el texto completo de la página
  const pageText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim())
  console.log('\nPágina completa (extracto):', pageText.substring(pageText.indexOf('Search report'), pageText.indexOf('Search report') + 500))

  // ── 2. Enrolled Detail con espera de AJAX ────────────────────────────────
  console.log('\n=== Enrolled Detail con todos los players ===')

  const enrolledIds = [372, 388, 536, 669, 884, 895, 957, 971]
  const players = []

  for (const id of enrolledIds) {
    allRequests.length = 0
    allResponses.length = 0

    await page.goto(`https://golf.org.ar/Enrolled/Detail/${id}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Extraer texto visible
    const txt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim())

    // Parsear HCP
    const hcpMatch = txt.match(/Handicap Index\s+([\d.]+)/)
    const lowHcpMatch = txt.match(/Low Handicap Index\s+([\d.]+)/)
    const matMatch = txt.match(/Enrollment number\s+(\S+)/)
    const nameMatch = txt.match(/First Name\s+(\S[^\n]+?)\s+Last Name\s+(\S[^\n]+?)\s+Clubes/)
    const genderMatch = txt.match(/Gender\s+(?:Male|Female)\s+(Male|Female)/)

    const player = {
      aagId:      id,
      matricula:  matMatch?.[1] ?? null,
      nombre:     nameMatch?.[1]?.trim() ?? null,
      apellido:   nameMatch?.[2]?.trim() ?? null,
      hcpIndex:   hcpMatch  ? parseFloat(hcpMatch[1])    : null,
      lowHcp:     lowHcpMatch ? parseFloat(lowHcpMatch[1]) : null,
      genero:     genderMatch?.[1] === 'Female' ? 'DAMA' : 'CABALLERO',
    }
    players.push(player)
    console.log(`  ID ${id}:`, player)
  }

  writeFileSync('scripts/ajax-players.json', JSON.stringify(players, null, 2))
  console.log('\n💾 players guardados en scripts/ajax-players.json')

  // Guardar requests para debug
  writeFileSync('scripts/ajax-requests.json', JSON.stringify(allRequests, null, 2))

  await browser.close()
  console.log('\n✅ Listo')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
