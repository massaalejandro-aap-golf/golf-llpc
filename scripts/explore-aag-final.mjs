/**
 * Script final: extrae todos los jugadores matriculados en AAG con sus HCPs.
 * Usa el HTML del detail page (carga AJAX) para leer los campos correctamente.
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
  await page.fill('#user', USER)
  await page.fill('#password', PASSWORD)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"], input[type="submit"]'),
  ])
}

/** Lee los datos de un jugador desde /Enrolled/Detail/{id} */
async function fetchPlayerDetail(page, id) {
  await page.goto(`https://golf.org.ar/Enrolled/Detail/${id}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  return page.evaluate(() => {
    const val = (id) => (document.getElementById(id)?.value ?? '').trim()
    const selectVal = (id) => document.getElementById(id)?.value ?? ''

    // Handicap values: están en .item-handicap como texto
    const hcpItems = document.querySelectorAll('.item-handicap')
    let hcpIndex = null
    let lowHcpIndex = null
    hcpItems.forEach(item => {
      const title = item.querySelector('.fieldTitle')?.textContent?.trim() ?? ''
      // El valor está en el siguiente elemento hermano o en el item mismo
      const allText = item.textContent.replace(/\s+/g, ' ').trim()
      const numMatch = allText.match(/[\d]+\.[\d]+|[\d]+/)
      const num = numMatch ? parseFloat(numMatch[0]) : null
      if (/^Handicap Index$/i.test(title)) hcpIndex = num
      if (/Low Handicap Index/i.test(title)) lowHcpIndex = num
    })

    const genderVal = selectVal('cmbGender')  // '0' = Male, '1' = Female
    const statusVal = val('')                  // Estado field (no tiene id, buscar por name)
    const estadoInput = document.querySelector('input[name="Estado"]')
    const estado = estadoInput?.value?.trim() ?? ''

    return {
      matricula:   val('number'),
      nombre:      val('firstNames'),
      apellido:    val('lastnames'),
      genero:      genderVal === '1' ? 'DAMA' : 'CABALLERO',
      hcpIndex,
      lowHcpIndex,
      estado,
      email:       val('email'),
      celular:     val('celPhone'),
      fechaNac:    val('birthDate') || null,
    }
  })
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

  // ── 1. Obtener lista de IDs enrolled ─────────────────────────────────────
  console.log('📋 Obteniendo lista de matriculados...')
  await page.goto('https://golf.org.ar/Enrolled/EnrolledByClub', { waitUntil: 'networkidle' })

  const enrolledList = await page.$$eval('table tbody tr', rows =>
    rows.map(r => {
      const cells = Array.from(r.querySelectorAll('td')).map(td => td.textContent?.trim())
      const detailLink = r.querySelector('a[href*="/Enrolled/Detail/"]')?.getAttribute('href')
      const id = detailLink ? parseInt(detailLink.split('/').pop()) : null
      return {
        id,
        dni:       cells[0],
        matricula: cells[1],
        nombre:    cells[2],
        apellido:  cells[3],
        email:     cells[4],
        genero:    cells[6],
        activo:    cells[7] === 'Active',
      }
    }).filter(r => r.id)
  )

  console.log(`Total matriculados en AAG: ${enrolledList.length}`)
  enrolledList.forEach(p => console.log(`  [${p.id}] ${p.matricula} ${p.nombre} ${p.apellido} — ${p.activo ? 'Activo' : 'Inactivo'}`))

  // ── 2. Extraer HCP de cada uno ────────────────────────────────────────────
  console.log('\n🏌️  Extrayendo HCPs...')
  const players = []

  for (const enrolled of enrolledList) {
    process.stdout.write(`  [${enrolled.id}] ${enrolled.nombre} ${enrolled.apellido}... `)
    try {
      const detail = await fetchPlayerDetail(page, enrolled.id)
      const player = { ...enrolled, ...detail, aagId: enrolled.id }
      players.push(player)
      console.log(`HCP: ${detail.hcpIndex ?? 'N/A'} (Low: ${detail.lowHcpIndex ?? 'N/A'})`)
    } catch (e) {
      console.log(`❌ Error: ${e.message}`)
      players.push({ ...enrolled, aagId: enrolled.id, hcpIndex: null, lowHcpIndex: null })
    }
  }

  // ── 3. Resultado final ────────────────────────────────────────────────────
  console.log('\n📊 RESULTADO COMPLETO:')
  console.log('='.repeat(80))
  players.forEach(p => {
    console.log(`Matrícula: ${p.matricula} | ${p.nombre} ${p.apellido} | ${p.genero} | HCP: ${p.hcpIndex} | ${p.activo ? 'Activo' : 'Inactivo'}`)
  })

  writeFileSync('scripts/aag-players-final.json', JSON.stringify(players, null, 2))
  console.log('\n💾 Guardado en scripts/aag-players-final.json')

  await browser.close()
}

main().catch(e => { console.error('❌', e); process.exit(1) })
