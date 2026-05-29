import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import CategoriaSetEditor from './CategoriaSetEditor'

export default async function CategoriaSetPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  const set = await prisma.categorySet.findUnique({
    where: { id: Number(id) },
    include: { categories: { orderBy: [{ genero: 'asc' }, { orden: 'asc' }] } },
  })

  if (!set) notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/ajustes/categorias"
          className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1 transition-colors"
        >
          ← Categorías
        </Link>
        <span className="text-gray-300">/</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{set.nombre}</h1>
          {set.descripcion && (
            <p className="text-sm text-gray-500 mt-0.5">{set.descripcion}</p>
          )}
        </div>
      </div>

      <CategoriaSetEditor set={set} />
    </div>
  )
}
