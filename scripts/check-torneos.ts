import { prisma } from '../lib/prisma'
async function main() {
  const torneos = await prisma.tournament.findMany({
    orderBy: { id: 'desc' },
    take: 5,
    select: { id: true, nombre: true, jugadoresPorLinea: true, reservasHabilitadas: true },
  })
  console.log(JSON.stringify(torneos, null, 2))
}
main().catch(console.error)
