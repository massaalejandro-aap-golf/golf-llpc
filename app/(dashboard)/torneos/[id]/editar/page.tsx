import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import EditarTorneoForm from './EditarTorneoForm'

export default async function EditarTorneoPage(props: { params: Promise<{ id: string }> }) {
  await requireRole('COMISION')
  const { id } = await props.params

  const [torneo, canchas, categorySets] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id: Number(id) },
      include: {
        teeHombre: true,
        teeDama:   true,
        categories: { orderBy: [{ genero: 'asc' }, { nombre: 'asc' }] },
      },
    }),
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

  if (!torneo) notFound()

  // Tees de la cancha actual (pre-cargados para evitar flash)
  const initialTees = await prisma.courseTee.findMany({
    where: { courseId: torneo.courseId },
    select: { id: true, nombre: true, color: true, slope: true, rating: true },
    orderBy: { nombre: 'asc' },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/torneos" className="hover:text-green-700">Torneos</Link>
        <span>/</span>
        <Link href={`/torneos/${id}`} className="hover:text-green-700 truncate max-w-[200px]">
          {torneo.nombre}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Editar</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Editar torneo</h1>

      <EditarTorneoForm
        torneo={torneo}
        canchas={canchas}
        categorySets={categorySets}
        initialTees={initialTees}
      />
    </div>
  )
}
