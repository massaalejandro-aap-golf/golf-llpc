import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import CanchaEditor from './CanchaEditor'

export default async function CanchaDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  const cancha = await prisma.course.findUnique({
    where: { id: Number(id) },
    include: {
      holes: { orderBy: { numero: 'asc' } },
      tees: {
        include: {
          hoyos: { select: { holeId: true, yardas: true } },
        },
        orderBy: { nombre: 'asc' },
      },
    },
  })

  if (!cancha) notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/ajustes/canchas"
          className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1 transition-colors"
        >
          ← Canchas
        </Link>
        <span className="text-gray-300">/</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{cancha.nombre}</h1>
          {(cancha.ciudad || cancha.pais) && (
            <p className="text-sm text-gray-500 mt-0.5">
              {cancha.ciudad}{cancha.pais ? ` · ${cancha.pais}` : ''}
            </p>
          )}
        </div>
      </div>

      <CanchaEditor
        canchaId={cancha.id}
        holes={cancha.holes}
        tees={cancha.tees.map((t) => ({
          id:          t.id,
          nombre:      t.nombre,
          color:       t.color,
          slope:       t.slope,
          slopeIda:    t.slopeIda,
          slopeVuelta: t.slopeVuelta,
          rating:      t.rating,
          hoyos:       t.hoyos,
        }))}
      />
    </div>
  )
}
