import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import NuevoTorneoForm from './NuevoTorneoForm'

export default async function NuevoTorneoPage() {
  await requireRole('COMISION')

  const [canchas, categorySets] = await Promise.all([
    prisma.course.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    }),
    prisma.categorySet.findMany({
      where: { activo: true },
      include: { categories: { orderBy: [{ genero: 'asc' }, { orden: 'asc' }] } },
      orderBy: { nombre: 'asc' },
    }),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nuevo torneo</h1>
      <NuevoTorneoForm canchas={canchas} categorySets={categorySets} />
    </div>
  )
}
