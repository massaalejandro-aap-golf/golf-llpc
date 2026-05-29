// Seed: La Lucila Polo Club — datos reales de cancha y usuario admin
// Fuente: Golfistics (lalucilapoloclub.com) — capturado 2026-05
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ─── Cancha La Lucila ─────────────────────────────────────────────────────────
//
// Par total Caballeros: 4+4+4+4+3+4+5+3+5+4+3+4+4+3+5+4+3+5 = 71
// Par total Damas:      4+4+4+4+3+5+4+3+5+4+3+4+4+3+4+5+3+5 = 71
//
// HCP Caballeros: 3,17,5,1,11,7,13,15,9,8,4,6,12,10,18,2,16,14
// HCP Damas:      1,15,17,9,13,7,3,5,11,2,8,12,4,16,6,18,10,14

const HOYOS_LA_LUCILA = [
  // n   parC parD  hcpC hcpD  azul  blanco  rojo
  [  1,   4,   4,    3,   1,   370,   360,   340 ],
  [  2,   4,   4,   17,  15,   300,   260,   205 ],
  [  3,   4,   4,    5,  17,   410,   390,   270 ],
  [  4,   4,   4,    1,   9,   405,   380,   333 ],
  [  5,   3,   3,   11,  13,   165,   160,   135 ],
  [  6,   4,   5,    7,   7,   455,   345,   315 ],
  [  7,   5,   4,   13,   3,   437,   500,   332 ],
  [  8,   3,   3,   15,   5,   131,   120,   131 ],
  [  9,   5,   5,    9,  11,   540,   515,   455 ],
  [ 10,   4,   4,    8,   2,   370,   355,   350 ],
  [ 11,   3,   3,    4,   8,   205,   165,   110 ],
  [ 12,   4,   4,    6,  12,   415,   390,   310 ],
  [ 13,   4,   4,   12,   4,   380,   365,   305 ],
  [ 14,   3,   3,   10,  16,   180,   165,   135 ],
  [ 15,   5,   4,   18,   6,   365,   440,   320 ],
  [ 16,   4,   5,    2,  18,   515,   420,   402 ],
  [ 17,   3,   3,   16,  10,   118,   110,   118 ],
  [ 18,   5,   5,   14,  14,   510,   500,   435 ],
]

// ─── Cancha Junior ────────────────────────────────────────────────────────────
// Tees: Blanco Caballeros (slope 102, rating 63, dist 4300)
//       Amarillo Caballeros (slope 109, rating 58, dist 3200)
//       Amarillo Damas (slope 119, rating 59.2, dist 3200)
//       Blanco Damas (slope 112, rating 66, dist 4300)
// Nota: no tenemos datos de yardas por hoyo del Junior — se cargan desde la UI

async function main() {
  console.log('🌱 Iniciando seed...')

  // ─── Cancha La Lucila ─────────────────────────────────────────────────────

  const laLucila = await prisma.course.upsert({
    where:  { id: 1 },
    update: { nombre: 'La Lucila Polo Club', ciudad: 'La Lucila, Buenos Aires', pais: 'Argentina' },
    create: { nombre: 'La Lucila Polo Club', ciudad: 'La Lucila, Buenos Aires', pais: 'Argentina' },
  })
  console.log(`✅ Cancha: ${laLucila.nombre}`)

  // Hoyos
  const holeIds: Record<number, number> = {}
  for (const [n, parC, parD, hcpC, hcpD] of HOYOS_LA_LUCILA) {
    const h = await prisma.hole.upsert({
      where:  { courseId_numero: { courseId: laLucila.id, numero: n } },
      update: { par: parC, parDamas: parD, handicapIndex: hcpC, handicapIndexDamas: hcpD },
      create: { courseId: laLucila.id, numero: n, par: parC, parDamas: parD, handicapIndex: hcpC, handicapIndexDamas: hcpD },
    })
    holeIds[n] = h.id
  }
  console.log(`✅ ${HOYOS_LA_LUCILA.length} hoyos de La Lucila cargados`)

  // Tees
  const teeAzul = await prisma.courseTee.upsert({
    where:  { courseId_nombre: { courseId: laLucila.id, nombre: 'Azul' } },
    update: { slope: 122, slopeIda: 123, slopeVuelta: 121, rating: 69.8, color: '#1D4ED8' },
    create: { courseId: laLucila.id, nombre: 'Azul', color: '#1D4ED8', slope: 122, slopeIda: 123, slopeVuelta: 121, rating: 69.8 },
  })
  const teeBlanco = await prisma.courseTee.upsert({
    where:  { courseId_nombre: { courseId: laLucila.id, nombre: 'Blanco' } },
    update: { slope: 116, slopeIda: 118, slopeVuelta: 113, rating: 68.2, color: '#D1D5DB' },
    create: { courseId: laLucila.id, nombre: 'Blanco', color: '#D1D5DB', slope: 116, slopeIda: 118, slopeVuelta: 113, rating: 68.2 },
  })
  const teeRojoC = await prisma.courseTee.upsert({
    where:  { courseId_nombre: { courseId: laLucila.id, nombre: 'Rojo' } },
    update: { slope: 105, slopeIda: 107, slopeVuelta: 103, rating: 63.7, color: '#DC2626' },
    create: { courseId: laLucila.id, nombre: 'Rojo', color: '#DC2626', slope: 105, slopeIda: 107, slopeVuelta: 103, rating: 63.7 },
  })
  // Tee Rojo Damas (mismo color, nombre diferente para distinguirlo)
  const teeRojoD = await prisma.courseTee.upsert({
    where:  { courseId_nombre: { courseId: laLucila.id, nombre: 'Rojo Damas' } },
    update: { slope: 116, slopeIda: 117, slopeVuelta: 114, rating: 68.7, color: '#DC2626' },
    create: { courseId: laLucila.id, nombre: 'Rojo Damas', color: '#DC2626', slope: 116, slopeIda: 117, slopeVuelta: 114, rating: 68.7 },
  })
  console.log('✅ Tees La Lucila: Azul, Blanco, Rojo, Rojo Damas')

  // Yardas
  for (const [n, , , , , azul, blanco, rojo] of HOYOS_LA_LUCILA) {
    const holeId = holeIds[n]
    for (const [teeId, yardas] of [
      [teeAzul.id,   azul],
      [teeBlanco.id, blanco],
      [teeRojoC.id,  rojo],
      [teeRojoD.id,  rojo], // mismo rojo que caballeros
    ] as [number, number][]) {
      await prisma.courseTeeHole.upsert({
        where:  { teeId_holeId: { teeId, holeId } },
        update: { yardas },
        create: { teeId, holeId, yardas },
      })
    }
  }
  console.log('✅ Yardas por hoyo cargadas')

  // ─── Cancha Junior ────────────────────────────────────────────────────────

  const junior = await prisma.course.upsert({
    where:  { id: 2 },
    update: { nombre: 'Junior', ciudad: 'La Lucila, Buenos Aires', pais: 'Argentina' },
    create: { id: 2, nombre: 'Junior', ciudad: 'La Lucila, Buenos Aires', pais: 'Argentina' },
  })
  console.log(`✅ Cancha: ${junior.nombre}`)

  await prisma.courseTee.upsert({
    where:  { courseId_nombre: { courseId: junior.id, nombre: 'Blanco' } },
    update: { slope: 102, rating: 63, color: '#D1D5DB' },
    create: { courseId: junior.id, nombre: 'Blanco', color: '#D1D5DB', slope: 102, rating: 63 },
  })
  await prisma.courseTee.upsert({
    where:  { courseId_nombre: { courseId: junior.id, nombre: 'Amarillo' } },
    update: { slope: 109, rating: 58, color: '#F59E0B' },
    create: { courseId: junior.id, nombre: 'Amarillo', color: '#F59E0B', slope: 109, rating: 58 },
  })
  await prisma.courseTee.upsert({
    where:  { courseId_nombre: { courseId: junior.id, nombre: 'Amarillo Damas' } },
    update: { slope: 119, rating: 59.2, color: '#F59E0B' },
    create: { courseId: junior.id, nombre: 'Amarillo Damas', color: '#F59E0B', slope: 119, rating: 59.2 },
  })
  await prisma.courseTee.upsert({
    where:  { courseId_nombre: { courseId: junior.id, nombre: 'Blanco Damas' } },
    update: { slope: 112, rating: 66, color: '#D1D5DB' },
    create: { courseId: junior.id, nombre: 'Blanco Damas', color: '#D1D5DB', slope: 112, rating: 66 },
  })
  console.log('✅ Tees Junior: Blanco, Amarillo, Amarillo Damas, Blanco Damas')

  // ─── Usuario admin ─────────────────────────────────────────────────────────

  const adminPassword = process.env.ADMIN_PASSWORD || 'golf2026'
  const hashed = await bcrypt.hash(adminPassword, 12)
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@lapclub.com' },
    update: {},
    create: { email: 'admin@lapclub.com', password: hashed, nombre: 'Administrador', role: 'ADMIN' },
  })
  console.log(`✅ Admin: ${admin.email}`)

  console.log('\n🏌️  Seed completado.')
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
