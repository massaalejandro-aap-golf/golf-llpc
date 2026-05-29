import { prisma } from '../lib/prisma'

async function main() {
  const course = await prisma.course.findFirst({ select: { id: true, nombre: true } })
  console.log('Course:', course)

  const t = await prisma.tournament.create({
    data: {
      nombre: 'TEST_DELETE_ME',
      fecha: new Date('2025-06-01'),
      tipo: 'MEDAL',
      hoyos: 'EIGHTEEN',
      ronda: 'Única',
      jugadoresPorLinea: 4,
      scoreMaxMedal: false,
      aagEnabled: true,
      reservasHabilitadas: true,
      courseId: course!.id,
      categories: {
        create: [
          { genero: 'CABALLERO', nombre: 'Única', scratch: false },
          { genero: 'DAMA',      nombre: 'Única', scratch: false },
        ],
      },
    },
    include: { categories: true },
  })
  console.log('Created:', t.id, t.nombre, '| reservasHabilitadas:', t.reservasHabilitadas)

  await prisma.tournament.delete({ where: { id: t.id } })
  console.log('Deleted OK')
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
