import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export default async function CanchaPage() {
  await requireSession()

  const course = await prisma.course.findFirst({
    orderBy: { id: 'asc' },
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

  if (!course) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-3xl mb-2">⛳</p>
        <p>No hay cancha configurada.</p>
        <Link href="/ajustes/canchas" className="text-sm text-green-600 hover:underline mt-2 inline-block">
          Configurar cancha →
        </Link>
      </div>
    )
  }

  const holesOut = course.holes.filter((h) => h.numero <= 9)
  const holesIn  = course.holes.filter((h) => h.numero >= 10)
  const parOut   = holesOut.reduce((a, h) => a + h.par, 0)
  const parIn    = holesIn.reduce((a, h)  => a + h.par, 0)

  // Map teeId → holeId → yardas
  type TeeMap = Map<number, Map<number, number | null>>
  const teeMap: TeeMap = new Map()
  for (const tee of course.tees) {
    const holeMap = new Map<number, number | null>()
    for (const h of tee.hoyos) holeMap.set(h.holeId, h.yardas ?? null)
    teeMap.set(tee.id, holeMap)
  }

  function teeYardas(teeId: number, holeId: number): number | null {
    return teeMap.get(teeId)?.get(holeId) ?? null
  }

  function teeTotal(teeId: number, holes: typeof holesOut) {
    return holes.reduce((s, h) => s + (teeYardas(teeId, h.id) ?? 0), 0)
  }

  const isDark = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 < 128
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.nombre}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {course.ciudad}{course.pais ? ` · ${course.pais}` : ''}
          </p>
        </div>
        <Link
          href="/ajustes/canchas"
          className="text-xs text-green-600 hover:text-green-800 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
        >
          ⚙ Configurar
        </Link>
      </div>

      {/* Tee cards: slope & rating */}
      {course.tees.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {course.tees.map((tee) => (
            <div key={tee.id} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <span
                  className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                  style={{ backgroundColor: tee.color }}
                />
                <p className="text-xs uppercase tracking-wide font-semibold text-gray-600">
                  {tee.nombre}
                </p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{tee.rating?.toFixed(1) ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">Rating</p>
              <p className="text-lg font-semibold text-gray-700 mt-2">{tee.slope ?? '—'}</p>
              <p className="text-xs text-gray-400">Slope</p>
              <p className="text-sm font-medium text-gray-500 mt-2">
                {teeTotal(tee.id, course.holes) > 0
                  ? teeTotal(tee.id, course.holes).toLocaleString('es-AR') + ' yds'
                  : '—'}
              </p>
            </div>
          ))}
          {/* Par total card */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Par cancha</p>
            <p className="text-3xl font-bold text-gray-900">{parOut + parIn}</p>
            <p className="text-xs text-gray-400 mt-1">{parOut} + {parIn}</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          No hay tees configurados para esta cancha.{' '}
          <Link href="/ajustes/canchas" className="font-medium underline">
            Configurar →
          </Link>
        </div>
      )}

      {/* Hole tables */}
      {course.holes.length > 0 && (
        <>
          <HoleTable
            label="IDA (hoyos 1–9)"
            holes={holesOut}
            tees={course.tees}
            teeYardas={teeYardas}
            parSum={parOut}
          />
          {holesIn.length > 0 && (
            <HoleTable
              label="VUELTA (hoyos 10–18)"
              holes={holesIn}
              tees={course.tees}
              teeYardas={teeYardas}
              parSum={parIn}
            />
          )}

          {/* Grand totals */}
          {course.tees.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="grid gap-4 text-center"
                style={{ gridTemplateColumns: `repeat(${2 + course.tees.length}, minmax(0, 1fr))` }}>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Total hoyos</p>
                  <p className="font-bold text-gray-900 text-lg">{course.holes.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Par total</p>
                  <p className="font-bold text-gray-900 text-lg">{parOut + parIn}</p>
                </div>
                {course.tees.map((tee) => {
                  const total = teeTotal(tee.id, course.holes)
                  return (
                    <div key={tee.id}>
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10"
                          style={{ backgroundColor: tee.color }}
                        />
                        <p className="text-xs uppercase tracking-wide"
                          style={{ color: tee.color }}>
                          {tee.nombre}
                        </p>
                      </div>
                      <p className="font-bold text-gray-900 text-lg">
                        {total > 0 ? total.toLocaleString('es-AR') : '—'}
                      </p>
                      <p className="text-xs text-gray-400">yds</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {course.holes.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">Esta cancha no tiene hoyos cargados</p>
          <Link href="/ajustes/canchas" className="text-xs text-green-600 hover:underline mt-1 inline-block">
            Ir a configuración →
          </Link>
        </div>
      )}
    </div>
  )
}

// ── HoleTable ─────────────────────────────────────────────────────────────

type TeeInfo = { id: number; nombre: string; color: string }
type HoleInfo = { id: number; numero: number; par: number; handicapIndex: number }

function HoleTable({
  label,
  holes,
  tees,
  teeYardas,
  parSum,
}: {
  label:     string
  holes:     HoleInfo[]
  tees:      TeeInfo[]
  teeYardas: (teeId: number, holeId: number) => number | null
  parSum:    number
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h2 className="font-semibold text-sm text-gray-700">{label}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 font-semibold text-gray-500 w-12">Hoyo</th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Par</th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-500">SI</th>
              {tees.map((tee) => (
                <th key={tee.id} className="text-center px-3 py-2.5 font-semibold">
                  <span className="flex items-center justify-center gap-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0"
                      style={{ backgroundColor: tee.color }}
                    />
                    <span style={{ color: tee.color }}>{tee.nombre}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {holes.map((h) => (
              <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 font-semibold text-gray-800">{h.numero}</td>
                <td className="px-3 py-2.5 text-center text-gray-700">{h.par}</td>
                <td className="px-3 py-2.5 text-center text-gray-400">{h.handicapIndex}</td>
                {tees.map((tee) => {
                  const y = teeYardas(tee.id, h.id)
                  return (
                    <td key={tee.id} className="px-3 py-2.5 text-center font-medium text-gray-700">
                      {y != null ? y : <span className="text-gray-300">—</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50">
              <td className="px-4 py-2.5 font-bold text-gray-700">Total</td>
              <td className="px-3 py-2.5 text-center font-bold text-gray-700">{parSum}</td>
              <td className="px-3 py-2.5 text-center text-gray-400">—</td>
              {tees.map((tee) => {
                const sum = holes.reduce((s, h) => s + (teeYardas(tee.id, h.id) ?? 0), 0)
                return (
                  <td key={tee.id} className="px-3 py-2.5 text-center font-bold text-gray-700">
                    {sum > 0 ? sum : '—'}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
