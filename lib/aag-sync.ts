/**
 * AAG Sync — descarga y actualiza handicaps desde golf.org.ar
 *
 * Flujo de autenticación (por orden de prioridad):
 *  1. Login HTTP directo con credenciales de PROVEEDOR (AAG_PROVIDER_USER/PASSWORD)
 *     → no requiere reCAPTCHA, rápido y confiable
 *  2. Fallback: Playwright con credenciales personales (AAG_USER/PASSWORD)
 *     → más lento, puede fallar si reCAPTCHA no carga en headless
 *
 * La sesión se cachea en data/aag-session.json y se renueva automáticamente.
 *
 * Exports:
 *  - lookupByMatricula(mat)  → busca cualquier matriculado en toda la AAG
 *  - runAagSync()            → actualiza HCP de todos los players en DB con matrícula
 *  - readSyncStatus()        → lee el último estado guardado
 */

import { chromium } from 'playwright'
import { prisma } from '@/lib/prisma'
import { writeFile, readFile, mkdir } from 'fs/promises'
import path from 'path'

const AAG_URL   = 'https://golf.org.ar'
const DATA_DIR  = path.join(process.cwd(), 'data')
const STATUS_FILE  = path.join(DATA_DIR, 'aag-sync-status.json')
const SESSION_FILE = path.join(DATA_DIR, 'aag-session.json')

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ── Helpers de normalización de nombres ───────────────────────────────────

/**
 * Inserta un espacio antes de cada letra mayúscula que sigue a una minúscula.
 * Corrige nombres CamelCase que llegan sin espacios desde la AAG.
 * Ej: "GabrielAntonio" → "Gabriel Antonio"
 *     "GarciaPiacentini" → "Garcia Piacentini"
 */
export function fixName(s: string): string {
  return s
    .replace(/([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Tipos ──────────────────────────────────────────────────────────────────

export type AagPlayerInfo = {
  matricula:  string
  nombre:     string
  apellido:   string
  genero:     'CABALLERO' | 'DAMA'
  hcpIndex:   number | null
  club:       string
  activo:     boolean
}

export type SyncStatus = {
  lastSync:  string | null
  status:    'idle' | 'running' | 'success' | 'error'
  updated:   number
  notFound:  number
  skipped:   number
  errors:    number
  message:   string
  details:   SyncDetail[]
}

export type SyncDetail = {
  matricula:  string
  nombre:     string
  apellido:   string
  hcpIndex:   number | null
  resultado:  'updated' | 'not_found' | 'skipped' | 'error'
  mensaje:    string
}

type AagSession = {
  cookies:    string   // header Cookie serializado
  savedAt:    string   // ISO date
}

// ── Persistencia ───────────────────────────────────────────────────────────

export async function readSyncStatus(): Promise<SyncStatus> {
  try {
    return JSON.parse(await readFile(STATUS_FILE, 'utf-8')) as SyncStatus
  } catch {
    return { lastSync: null, status: 'idle', updated: 0, notFound: 0, skipped: 0, errors: 0,
             message: 'Sin sincronizaciones previas', details: [] }
  }
}

async function saveSyncStatus(s: SyncStatus) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(STATUS_FILE, JSON.stringify(s, null, 2), 'utf-8')
}

async function readSession(): Promise<AagSession | null> {
  // 1. Intentar leer sesión guardada en archivo
  try {
    return JSON.parse(await readFile(SESSION_FILE, 'utf-8')) as AagSession
  } catch { /* no existe o está corrupto */ }

  // 2. Fallback: usar cookies configuradas manualmente en .env
  //    Útil cuando no hay sesión guardada y el login automático falla
  const sessionId  = process.env.AAG_SESSION_ID
  const authCookie = process.env.AAG_SESSION_COOKIE
  if (sessionId && authCookie) {
    console.log('[AAG] Usando cookies de sesión del .env')
    return {
      cookies:  `ASP.NET_SessionId=${sessionId}; .ASPXAUTH=${authCookie}`,
      savedAt:  new Date().toISOString(),
    }
  }

  return null
}

async function saveSession(cookies: string) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(SESSION_FILE, JSON.stringify({ cookies, savedAt: new Date().toISOString() } as AagSession, null, 2))
}

// ── Login HTTP directo (credenciales de proveedor, sin reCAPTCHA) ──────────
//
// Las cuentas de proveedor en golf.org.ar no requieren reCAPTCHA v3.
// Hacemos un POST directo al formulario de login y extraemos las cookies
// de autenticación (.ASPXAUTH + ASP.NET_SessionId).

async function doDirectLogin(user: string, pass: string): Promise<string | null> {
  try {
    // Paso 1: GET para obtener el CSRF token y la cookie de sesión inicial
    const getRes = await fetch(`${AAG_URL}/Home/Login`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!getRes.ok) {
      console.log(`[AAG] Login directo GET falló: ${getRes.status}`)
      return null
    }
    const html = await getRes.text()

    // Extraer ASP.NET_SessionId del header Set-Cookie del GET
    const rawSetCookieGet = getRes.headers.get('set-cookie') ?? ''
    const sessionIdMatch  = rawSetCookieGet.match(/ASP\.NET_SessionId=([^;,\s]+)/i)
    const sessionCookie   = sessionIdMatch ? `ASP.NET_SessionId=${sessionIdMatch[1]}` : ''

    // Extraer token antiforgery del HTML
    const csrfMatch = html.match(/name="__RequestVerificationToken"[^>]+value="([^"]+)"/)
    const csrf      = csrfMatch?.[1] ?? ''

    console.log(`[AAG] Login directo: sessionId=${sessionCookie ? 'OK' : 'no encontrado'}, csrf=${csrf ? 'OK' : 'no encontrado'}, htmlLen=${html.length}`)

    // Paso 2: POST con las credenciales (sin captcha — proveedor no lo necesita)
    const body = new URLSearchParams()
    body.set('user',     user)
    body.set('password', pass)
    body.set('captcha',  '')
    if (csrf) body.set('__RequestVerificationToken', csrf)

    const postRes = await fetch(`${AAG_URL}/Home/Login`, {
      method:   'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie':       sessionCookie,
        'User-Agent':   USER_AGENT,
        'Referer':      `${AAG_URL}/Home/Login`,
        'Origin':       AAG_URL,
      },
      body:     body.toString(),
      redirect: 'manual',
    })

    const location      = postRes.headers.get('location') ?? ''
    const setCookiePost = postRes.headers.get('set-cookie') ?? ''
    console.log(`[AAG] Login directo POST: status=${postRes.status}, location=${location}, set-cookie=${setCookiePost.substring(0, 60)}…`)

    // Login exitoso = redirige a cualquier página que NO sea el login
    const ok = (postRes.status === 301 || postRes.status === 302) &&
               !location.toLowerCase().includes('login')
    if (!ok) {
      console.log(`[AAG] Login directo: no autenticado`)
      return null
    }

    // Paso 3: Extraer .ASPXAUTH de las cookies de la respuesta POST
    const authMatch = setCookiePost.match(/\.ASPXAUTH=([^;,\s]+)/i)
    if (!authMatch) {
      console.log('[AAG] Login directo: faltó .ASPXAUTH en la respuesta')
      return null
    }

    const cookieHeader = [sessionCookie, `.ASPXAUTH=${authMatch[1]}`]
      .filter(Boolean).join('; ')
    return cookieHeader

  } catch (e) {
    console.log('[AAG] Login directo error:', e instanceof Error ? e.message : String(e))
    return null
  }
}

// ── Login vía Playwright (fallback para cuenta personal con reCAPTCHA) ─────

async function doPlaywrightLogin(): Promise<string> {
  const user     = process.env.AAG_USER
  const password = process.env.AAG_PASSWORD
  if (!user || !password) throw new Error('Faltan AAG_USER / AAG_PASSWORD en .env')

  console.log('[AAG] Iniciando login con Playwright…')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ userAgent: USER_AGENT })
  const page    = await context.newPage()

  try {
    await page.goto(`${AAG_URL}/Home/Login`, { waitUntil: 'networkidle' })
    // Esperar a que reCAPTCHA v3 rellene el campo oculto
    await page.waitForFunction(() => {
      const el = document.getElementById('captcha') as HTMLInputElement | null
      return el && el.value && el.value.length > 10
    }, { timeout: 20000 }).catch(() => {})

    await page.fill('#user',     user)
    await page.fill('#password', password)
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}),
      page.click('button[type="submit"], input[type="submit"]'),
    ])

    if (page.url().includes('Login')) throw new Error('Login fallido (Playwright) — verificar credenciales')

    const rawCookies   = await context.cookies()
    const cookieHeader = rawCookies.map(c => `${c.name}=${c.value}`).join('; ')
    await saveSession(cookieHeader)
    console.log('[AAG] Login Playwright OK, sesión guardada')
    return cookieHeader
  } finally {
    await browser.close()
  }
}

// ── Login principal: proveedor HTTP → Playwright ───────────────────────────

async function doLogin(): Promise<string> {
  // 1. Intentar login directo con credenciales de proveedor (rápido, sin CAPTCHA)
  //    Funciona si el servidor no exige reCAPTCHA para proveedores.
  const provUser = process.env.AAG_PROVIDER_USER
  const provPass = process.env.AAG_PROVIDER_PASSWORD
  if (provUser && provPass) {
    const cookies = await doDirectLogin(provUser, provPass)
    if (cookies) {
      await saveSession(cookies)
      console.log('[AAG] Login OK con credenciales de proveedor')
      return cookies
    }
    console.log('[AAG] Login directo falló (reCAPTCHA requerido), usando Playwright…')
  }

  // 2. Playwright con credenciales personales (maneja reCAPTCHA v3 via browser real)
  return doPlaywrightLogin()
}

// ── HTTP con sesión cacheada ───────────────────────────────────────────────

let _sessionCache: string | null = null

async function aagFetch(url: string, retried = false): Promise<Response> {
  // Obtener cookies cacheadas (memoria → archivo → login)
  if (!_sessionCache) {
    const saved = await readSession()
    _sessionCache = saved?.cookies ?? null
  }
  if (!_sessionCache) {
    _sessionCache = await doLogin()
  }

  const res = await fetch(url, {
    headers: {
      'Cookie':     _sessionCache,
      'User-Agent': USER_AGENT,
      'Referer':    AAG_URL,
    },
    redirect: 'follow',
  })

  // Si redirige a Login, sesión expirada → re-login
  const finalUrl = res.url
  if ((finalUrl.includes('Login') || res.status === 401) && !retried) {
    console.log('[AAG] Sesión expirada, re-logueando…')
    _sessionCache = null  // limpiar cache antes de re-login
    _sessionCache = await doLogin()
    return aagFetch(url, true)
  }

  return res
}

// ── Extraer internal ID de una fila del search ────────────────────────────

function extractInternalId(rowHtml: string): number | null {
  // El onchange es: Redireccionar(11149 + ':' + 13831, this)
  // Patrón: onchange="Redireccionar({internalId} + ':' + {matricula},this)"
  const m = rowHtml.match(/Redireccionar\((\d+)\s*\+\s*':'/i)
  return m ? parseInt(m[1]) : null
}

// ── Lookup por matrícula (busca en toda la AAG) ───────────────────────────

export async function lookupByMatricula(matricula: string): Promise<AagPlayerInfo | null> {
  // 1. Buscar por número
  const searchUrl = `${AAG_URL}/Enrolled/Search?name=${encodeURIComponent(matricula)}`
  const searchRes = await aagFetch(searchUrl)
  const searchHtml = await searchRes.text()

  // 2. Parsear filas de la tabla con regex (sin DOM)
  const rowPattern = /<tr[^>]*class="grid-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  let match: RegExpExecArray | null
  let internalId: number | null = null
  let rowData: {
    nombre: string; club: string; activo: boolean
    genero: 'CABALLERO' | 'DAMA'
  } | null = null

  while ((match = rowPattern.exec(searchHtml)) !== null) {
    const rowHtml = match[1]

    // Extraer EnrollmentNumber de data-name="EnrollmentNumber"
    const numMatch = rowHtml.match(/data-name="EnrollmentNumber"[^>]*>(\d+)</)
    if (!numMatch) continue
    if (numMatch[1] !== matricula) continue // exacto

    // Es nuestro jugador
    internalId = extractInternalId(rowHtml)

    const nameMatch  = rowHtml.match(/data-name="DisplayName"[^>]*>([^<]+)</)
    const clubMatch  = rowHtml.match(/data-name="EnrollmentClub"[^>]*>([^<]+)</)
    const catMatch   = rowHtml.match(/data-name="EnrollmentCategoria"[^>]*>([^<]+)</)
    const decomMatch = rowHtml.match(/data-name="Decommission"[^>]*>([^<]+)</)

    const fullName  = nameMatch?.[1]?.trim() ?? ''
    const club      = clubMatch?.[1]?.trim() ?? ''
    const categoria = catMatch?.[1]?.trim() ?? ''
    const activo    = /activo|active/i.test(decomMatch?.[1]?.trim() ?? '')
    const genero: 'CABALLERO' | 'DAMA' = /DAM/i.test(categoria) ? 'DAMA' : 'CABALLERO'

    // Separar apellido, nombre (formato "APELLIDO, NOMBRE" o "Apellido, Nombre")
    rowData = { nombre: fullName, club, activo, genero }
    break
  }

  if (!internalId || !rowData) return null

  // 3. Ir al detail para obtener el HCP
  const detailUrl = `${AAG_URL}/Enrolled/Detail?Id=${internalId}`
  const detailRes = await aagFetch(detailUrl)
  const detailHtml = await detailRes.text()

  // Extraer HCP de los bloques .item-handicap
  // Estructura: <div class="item-handicap"><span class="fieldTitle">Handicap Index </span>
  //              <div class="report-title">4,9</div></div>
  let hcpIndex: number | null = null
  const blocks = detailHtml.split('<div class="item-handicap">')
  for (const block of blocks) {
    const titleM = block.match(/<span[^>]*class="fieldTitle"[^>]*>\s*([^<]+?)\s*<\/span>/)
    if (titleM && titleM[1].trim() === 'Handicap Index') {
      const valM = block.match(/<div[^>]*class="report-title"[^>]*>([\d,]+)/)
      if (valM) { hcpIndex = parseFloat(valM[1].replace(',', '.')); break }
    }
  }

  // Parsear nombre/apellido del formato "APELLIDO , NOMBRE" o "Apellido, Nombre"
  const fullName = rowData.nombre
  let nombre = fullName, apellido = ''
  const commaIdx = fullName.indexOf(',')
  if (commaIdx !== -1) {
    apellido = fixName(fullName.substring(0, commaIdx).trim())
    nombre   = fixName(fullName.substring(commaIdx + 1).trim())
  } else {
    nombre = fixName(fullName)
  }

  return {
    matricula,
    nombre,
    apellido,
    genero:  rowData.genero,
    hcpIndex,
    club:    rowData.club,
    activo:  rowData.activo,
  }
}

// ── Sync masivo: todos los players en DB con matrícula ────────────────────

export async function runAagSync(): Promise<SyncStatus> {
  await saveSyncStatus({
    lastSync: null, status: 'running',
    updated: 0, notFound: 0, skipped: 0, errors: 0,
    message: 'Sincronizando…', details: [],
  })

  const details: SyncDetail[] = []
  let updated = 0, notFound = 0, skipped = 0, errors = 0

  try {
    // Obtener todos los players que tienen matrícula
    const players = await prisma.player.findMany({
      where: { matricula: { not: null }, activo: true },
      select: { id: true, matricula: true, nombre: true, apellido: true, hcpIndex: true },
    })

    console.log(`[AAG Sync] ${players.length} jugadores con matrícula en DB`)

    for (const player of players) {
      const mat = player.matricula!
      try {
        const info = await lookupByMatricula(mat)

        if (!info) {
          notFound++
          details.push({ matricula: mat, nombre: player.nombre, apellido: player.apellido,
            hcpIndex: null, resultado: 'not_found',
            mensaje: `Matrícula ${mat} no encontrada en AAG o dada de baja` })
          continue
        }

        if (!info.activo) {
          skipped++
          details.push({ matricula: mat, nombre: info.nombre, apellido: info.apellido,
            hcpIndex: null, resultado: 'skipped', mensaje: 'Dado de baja en AAG' })
          continue
        }

        if (info.hcpIndex === null) {
          errors++
          details.push({ matricula: mat, nombre: info.nombre, apellido: info.apellido,
            hcpIndex: null, resultado: 'error', mensaje: 'HCP no disponible en AAG' })
          continue
        }

        await prisma.player.update({
          where: { id: player.id },
          data:  { hcpIndex: info.hcpIndex },
        })

        updated++
        details.push({ matricula: mat, nombre: info.nombre, apellido: info.apellido,
          hcpIndex: info.hcpIndex, resultado: 'updated',
          mensaje: `HCP actualizado de ${player.hcpIndex} → ${info.hcpIndex}` })

        console.log(`[AAG Sync] ✓ ${info.apellido}, ${info.nombre} (${mat}) → HCP ${info.hcpIndex}`)

      } catch (e) {
        errors++
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[AAG Sync] ✗ ${mat}: ${msg}`)
        details.push({ matricula: mat, nombre: player.nombre, apellido: player.apellido,
          hcpIndex: null, resultado: 'error', mensaje: msg })
      }
    }

    const result: SyncStatus = {
      lastSync: new Date().toISOString(), status: 'success',
      updated, notFound, skipped, errors,
      message: `${updated} actualizados · ${notFound} no encontrados · ${skipped} inactivos · ${errors} errores`,
      details,
    }
    await saveSyncStatus(result)
    return result

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const result: SyncStatus = {
      lastSync: new Date().toISOString(), status: 'error',
      updated, notFound, skipped, errors, message: msg, details,
    }
    await saveSyncStatus(result)
    throw e
  }
}
