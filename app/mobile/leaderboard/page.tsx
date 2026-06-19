import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TIPO_LABEL: Record<string, string> = {
  MEDAL: 'Medal', STABLEFORD: 'Stableford', MATCH_PLAY: 'Match Play',
  CHOICE_ECLECTIC: 'Choice/Eclectic', RANKING: 'Ranking', GOLFER: 'Golfer',
  FOURBALL_AMERICANO: 'Fourball Americano', FOURBALL_CLASICO: 'Fourball Clásico',
  FOURBALL_AGGREGATE: 'Fourball Aggregate', LAGUNEADA: 'Laguneada',
  FOURSOME: 'Foursome', SCRAMBLE: 'Scramble', PELOTERO: 'Pelotero',
}

function fmtFecha(d: Date) {
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MobileLeaderboardPage() {
  await requireSession()

  const torneos = await prisma.tournament.findMany({
    orderBy: { fecha: 'desc' },
    select: {
      id: true, nombre: true, fecha: true, tipo: true, status: true,
      _count: { select: { results: true } },
    },
  })

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-green-700 text-white px-6 pt-10 pb-6">
        <p className="text-green-200 text-sm font-medium tracking-wide uppercase">La Lucila Golf Club</p>
        <h1 className="text-xl font-bold mt-1">Leaderboard</h1>
      </div>

      <div className="flex-1 px-4 py-5 space-y-2">
        {torneos.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p className="text-4xl mb-3">🏌️</p>
            <p className="font-medium">No hay torneos cargados todavía.</p>
          </div>
        ) : (
          torneos.map((t) => (
            <Link
              key={t.id}
              href={`/mobile/leaderboard/${t.id}`}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm active:scale-95 transition-transform"
            >
              <span className="text-2xl">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{t.nombre}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fmtFecha(t.fecha)} · {TIPO_LABEL[t.tipo] ?? t.tipo}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-gray-400">{t._count.results} res.</span>
                <span className="block text-gray-300 text-lg">›</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="p-4">
        <Link
          href="/mobile"
          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-5 py-4 font-semibold active:scale-95 transition-transform"
        >
          ← Volver al menú
        </Link>
      </div>
    </div>
  )
}
