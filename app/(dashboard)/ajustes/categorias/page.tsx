import { prisma } from '@/lib/prisma'
import CategoriasClient from './CategoriasClient'

export default async function CategoriasPage() {
  const sets = await prisma.categorySet.findMany({
    where: { activo: true },
    include: {
      categories: { orderBy: [{ genero: 'asc' }, { orden: 'asc' }] },
    },
    orderBy: { nombre: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Plantillas de categorías por handicap — se asignan al crear un torneo
          </p>
        </div>
      </div>

      <CategoriasClient initialSets={sets} />
    </div>
  )
}
