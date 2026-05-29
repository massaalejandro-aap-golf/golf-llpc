/**
 * Test rápido de credenciales AAG
 * Uso: node scripts/test-aag.mjs [usuario] [clave] [matricula]
 *
 * Ejemplo:
 *   node scripts/test-aag.mjs digitalgolf347 2b579a25-fc01-4af7-a902-81f1540cb01f 88730
 */

const [,, user = 'digitalgolf347', pass = '2b579a25-fc01-4af7-a902-81f1540cb01f', matricula = '88730'] = process.argv

const BASE = 'https://golf.org.ar'
const basicAuth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')

console.log(`\n🔑 Usuario:   ${user}`)
console.log(`🔑 Clave:     ${pass}`)
console.log(`🔍 Matrícula: ${matricula}\n`)

// ── 1. Probar login web ───────────────────────────────────────────────────────
async function testLogin() {
  console.log('── 1. Login web (Account/LogOn) ──────────────────────')
  try {
    // GET → obtener CSRF
    const pageRes = await fetch(`${BASE}/Account/LogOn`)
    const html    = await pageRes.text()
    const csrf    = html.match(/name="__RequestVerificationToken"[^>]+value="([^"]+)"/)?.[1] ?? ''
    const cookie  = (pageRes.headers.get('set-cookie') ?? '').split(',').map(c => c.split(';')[0]).join('; ')

    console.log(`   GET /Account/LogOn → ${pageRes.status}  |  CSRF: ${csrf ? 'OK' : 'no encontrado'}`)

    // POST → login
    const body = new URLSearchParams({ UserName: user, Password: pass, __RequestVerificationToken: csrf })
    const loginRes = await fetch(`${BASE}/Account/LogOn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
      body: body.toString(),
      redirect: 'manual',
    })

    const location = loginRes.headers.get('location') ?? ''
    const loginCookies = loginRes.headers.get('set-cookie') ?? ''
    console.log(`   POST /Account/LogOn → ${loginRes.status}  |  Location: ${location || '(ninguna)'}`)

    const success = loginRes.status === 302 && !location.toLowerCase().includes('logon')
    console.log(`   Resultado: ${success ? '✅ Login exitoso' : '❌ Credenciales rechazadas'}\n`)
    return success
      ? { loginCookies, pageCookie: cookie }
      : null

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}\n`)
    return null
  }
}

// ── 2. Probar endpoints REST con Basic auth ───────────────────────────────────
async function testApiEndpoints() {
  console.log('── 2. Endpoints REST (Basic auth) ────────────────────')
  const endpoints = [
    `/api/Enrolled/GetByMatricula/${matricula}`,
    `/api/Enrolled/GetByMatricula?Matricula=${matricula}`,
    `/api/Enrolled/Search?Matricula=${matricula}`,
    `/api/Enrolled/EnrolledByClub?Matricula=${matricula}`,
    `/api/Matriculados/GetByMatricula/${matricula}`,
    `/api/Jugador/GetByMatricula/${matricula}`,
    `/api/Buscador/Matriculados?Matricula=${matricula}`,
  ]

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE}${ep}`, {
        headers: { Authorization: basicAuth, Accept: 'application/json' },
        redirect: 'manual',
      })
      const ct   = res.headers.get('content-type') ?? ''
      const loc  = res.headers.get('location') ?? ''
      let body = ''
      try { body = await res.text() } catch {}

      const preview = body.length > 120 ? body.slice(0, 120) + '…' : body
      console.log(`   ${res.status} ${ep}`)
      if (loc) console.log(`       → redirect: ${loc}`)
      if (body) console.log(`       → ${preview}`)
    } catch (e) {
      console.log(`   ERR ${ep}  |  ${e.message}`)
    }
  }
  console.log()
}

// ── 3. Buscar en Buscador/Matriculados con sesión web ─────────────────────────
async function testBuscador(cookies) {
  if (!cookies) { console.log('── 3. Buscador web (saltado — login falló)\n'); return }
  console.log('── 3. Buscador web (POST Buscador/Matriculados) ───────')
  try {
    const allCookies = [
      cookies.pageCookie,
      ...(cookies.loginCookies ?? '').split(',').map(c => c.split(';')[0]),
    ].filter(Boolean).join('; ')

    // GET buscador → CSRF
    const buscRes = await fetch(`${BASE}/Buscador/Matriculados`, {
      headers: { Cookie: allCookies }
    })
    const buscHtml = await buscRes.text()
    const csrf2    = buscHtml.match(/name="__RequestVerificationToken"[^>]+value="([^"]+)"/)?.[1] ?? ''
    const c2 = [allCookies, ...(buscRes.headers.get('set-cookie') ?? '').split(',').map(c => c.split(';')[0])].join('; ')

    console.log(`   GET /Buscador/Matriculados → ${buscRes.status}  |  CSRF: ${csrf2 ? 'OK' : 'no encontrado'}`)

    const searchBody = new URLSearchParams({ Matricula: matricula, Nombre: '', Apellido: '', __RequestVerificationToken: csrf2 })
    const searchRes  = await fetch(`${BASE}/Buscador/Matriculados`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: c2 },
      body:    searchBody.toString(),
    })
    const resultHtml = await searchRes.text()
    console.log(`   POST /Buscador/Matriculados → ${searchRes.status}`)

    // Buscar la matrícula en la tabla
    const found = resultHtml.includes(matricula)
    if (found) {
      // Extraer la fila
      const rowMatch = resultHtml.match(new RegExp(`<tr[^>]*>[\\s\\S]*?${matricula}[\\s\\S]*?<\\/tr>`, 'i'))
      if (rowMatch) {
        const cells = [...rowMatch[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
          .map(([, c]) => c.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim())
        console.log(`   ✅ Jugador encontrado: ${JSON.stringify(cells)}`)
      } else {
        console.log(`   ✅ Matrícula ${matricula} encontrada en la respuesta`)
      }
    } else {
      console.log(`   ⚠️  Matrícula ${matricula} no encontrada en la tabla`)
      // Mostrar parte del HTML para debug
      const excerpt = resultHtml.slice(resultHtml.indexOf('<table'), resultHtml.indexOf('<table') + 500)
      if (excerpt.length > 10) console.log(`   HTML snippet: ${excerpt.replace(/<[^>]+>/g, ' ').slice(0, 200)}`)
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`)
  }
  console.log()
}

// ── Ejecutar ──────────────────────────────────────────────────────────────────
;(async () => {
  const loginResult = await testLogin()
  await testApiEndpoints()
  await testBuscador(loginResult)
  console.log('Listo.')
})()
