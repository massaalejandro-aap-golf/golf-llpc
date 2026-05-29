/**
 * Importa jugadores del padrón AAG al sistema local.
 *
 * Flujo:
 *   1. El usuario exporta el JSON desde golf.org.ar con el snippet de browser.
 *   2. Coloca el JSON en la carpeta scripts/ (o pasa la ruta por argumento).
 *   3. Ejecutar: npx tsx scripts/import-aag-players.ts [ruta-al-json]
 *
 * Ejemplo:
 *   npx tsx scripts/import-aag-players.ts scripts/aag-club347.json
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface AAGRow {
  matricula: string
  dni:       string | null
  apellido:  string
  nombre:    string
  fechaNac:  string | null   // "D/M/YYYY" — formato argentino
  genero:    'DAMA' | 'CABALLERO'
  hcpIndex?: number          // Si viene del Excel AAG, usar el valor real
  telefono?: string | null
  email:     string | null
  aagId:     string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convierte "D/M/YYYY" (fecha argentina) en Date UTC. */
function parseArgDate(str: string | null): Date | null {
  if (!str) return null
  const parts = str.trim().split('/')
  if (parts.length !== 3) return null
  const [d, m, y] = parts.map(Number)
  if (!d || !m || !y || y < 1900 || y > 2100) return null
  return new Date(Date.UTC(y, m - 1, d))
}

/** Capitaliza nombre/apellido recibido en mayúsculas del padrón. */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|-)(\p{L})/gu, (_, c: string) => c.toUpperCase())
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const filePath = process.argv[2] ?? 'scripts/aag-club347.json'

  console.log(`\n📂  Leyendo: ${filePath}`)
  let rows: AAGRow[]
  try {
    rows = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.error(`❌  No se pudo leer el archivo: ${filePath}`)
    console.error('    Asegurate de haber ejecutado el snippet en el browser y copiar el JSON aquí.')
    process.exit(1)
  }
  console.log(`📊  ${rows.length} jugadores a importar\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  let errors  = 0

  for (const p of rows) {
    if (!p.matricula || !p.nombre || !p.apellido) {
      console.warn(`⚠️   Fila incompleta, saltando: mat=${p.matricula} nombre=${p.nombre}`)
      skipped++
      continue
    }

    try {
      const fechaNac = parseArgDate(p.fechaNac)
      const nombre   = toTitleCase(p.nombre)
      const apellido = toTitleCase(p.apellido)

      const existing = await prisma.player.findUnique({
        where: { matricula: p.matricula },
      })

      if (existing) {
        await prisma.player.update({
          where: { matricula: p.matricula },
          data: {
            nombre,
            apellido,
            genero:  p.genero,
            activo:  true,
            // Solo actualizar si vienen datos (no pisar lo ya cargado manualmente)
            ...(p.hcpIndex != null ? { hcpIndex: p.hcpIndex } : {}),
            ...(p.dni      ? { dni:      p.dni      } : {}),
            ...(p.telefono ? { telefono: p.telefono } : {}),
            ...(fechaNac   ? { fechaNac }              : {}),
            ...(p.email    ? { email:    p.email    } : {}),
            ...(p.aagId    ? { aagId:    p.aagId    } : {}),
          },
        })
        console.log(`  🔄  ${apellido}, ${nombre} (mat. ${p.matricula}) HCP ${p.hcpIndex?.toFixed(1) ?? '—'} — actualizado`)
        updated++
      } else {
        await prisma.player.create({
          data: {
            matricula: p.matricula,
            nombre,
            apellido,
            genero:   p.genero,
            hcpIndex: p.hcpIndex ?? 0,
            tipo:     'SOCIO',
            dni:      p.dni      ?? null,
            telefono: p.telefono ?? null,
            fechaNac: fechaNac   ?? null,
            email:    p.email    ?? null,
            aagId:    p.aagId    ?? null,
            activo:   true,
          },
        })
        console.log(`  ✅  ${apellido}, ${nombre} (mat. ${p.matricula}) HCP ${p.hcpIndex?.toFixed(1) ?? '—'} — creado`)
        created++
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`  ❌  mat. ${p.matricula}: ${msg}`)
      errors++
    }
  }

  const line = '─'.repeat(52)
  console.log(`\n${line}`)
  console.log(`✅  Creados:      ${created}`)
  console.log(`🔄  Actualizados: ${updated}`)
  console.log(`⚠️   Saltados:     ${skipped}`)
  console.log(`❌  Errores:      ${errors}`)
  console.log(`📊  Procesados:   ${created + updated} / ${rows.length}`)
  console.log(line)
  console.log('\n⚡  Tip: Los HCP quedaron en 0. Actualizalos en cada ficha con "Buscar AAG".')
  console.log('    (Próximamente: botón de sincronización masiva de HCP)\n')
}

main()
  .catch((e) => {
    console.error('\n❌  Error fatal:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
