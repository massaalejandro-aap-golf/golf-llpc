import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function CanchasAjustesPage() {
  const canchas = await prisma.course.findMany({
    include: {
      tees:  { select: { id: true, nombre: true, color: true, slope: true, rating: true } },
      holes: { select: { id: true } },
    },
    orderBy: { nombre: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canchas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configuración de tees, slope, rating y yardas por hoyo</p>
        </div>
      </div>

      <div className="grid gap-4">
        {canchas.map((c) => (
          <Link
            key={c.id}
            href={`/ajustes/canchas/${c.id}`}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-green-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900 group-hover:text-green-800">
                  {c.nombre}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {c.ciudad}{c.pais ? ` · ${c.pais}` : ''} · {c.holes.length} hoyos
                </p>
              </div>
              <span className="text-gray-400 group-hover:text-green-600 text-sm">Configurar →</span>
            </div>

            {/* Tees */}
            {c.tees.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {c.tees.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.nombre}
                    {t.slope && <span className="opacity-75">· {t.slope}</span>}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-3 w-fit">
                Sin tees configurados — hacé clic para agregar
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
