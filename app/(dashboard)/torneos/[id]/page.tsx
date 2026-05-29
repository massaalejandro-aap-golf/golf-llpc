import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { TournamentStatus } from '@/app/generated/prisma/client'
import TorneoActions from './TorneoActions'

const STATUS_LABEL: Record<TournamentStatus, string> = {
  ACTIVO:     'Activo',
  EN_JUEGO:   'En juego',
  FINALIZADO: 'Finalizado',
  PROCESADO:  'Procesado',
  POSPUESTO:  'Pospuesto',
  SUSPENDIDO: 'Suspendido',
  CANCELADO:  'Cancelado',
}

const STATUS_COLOR: Record<TournamentStatus, string> = {
  ACTIVO:     'bg-green-100 text-green-800',
  EN_JUEGO:   'bg-blue-100 text-blue-800',
  FINALIZADO: 'bg-gray-100 text-gray-700',
  PROCESADO:  'bg-purple-100 text-purple-800',
  POSPUESTO:  'bg-yellow-100 text-yellow-800',
  SUSPENDIDO: 'bg-orange-100 text-orange-800',
  CANCELADO:  'bg-red-100 text-red-800',
}

const TIPO_LABEL: Record<string, string> = {
  MEDAL: 'Medal', STABLEFORD: 'Stableford', MATCH_PLAY: 'Match Play',
  CHOICE_ECLECTIC: 'Choice / Eclectic', RANKING: 'Ranking', GOLFER: 'Golfer',
  FOURBALL_AMERICANO: 'Fourball Americano', FOURBALL_CLASICO: 'Fourball Clásico',
  FOURBALL_AGGREGATE: 'Fourball Aggregate', LAGUNEADA: 'Laguneada',
  FOURSOME_CHAPMAN: 'Foursome Chapman', FOURSOME_MIXED: 'Foursome Mixto',
  FOURSOME: 'Foursome', SCRAMBLE: 'Scramble', PELOTERO: 'Pelotero',
}

export default async function TorneoDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await requireSession()

  const torneo = await prisma.tournament.findUnique({
    where: { id: Number(id) },
    include: {
      course: true,
      teeHombre: { select: { id: true, nombre: true, color: true, slope: true, rating: true } },
      teeDama:   { select: { id: true, nombre: true, color: true, slope: true, rating: true } },
      categories: { orderBy: [{ genero: 'asc' }, { nombre: 'asc' }] },
      teeTimeSlots: {
        orderBy: { hora: 'asc' },
        include: {
          players: {
            include: {
              player: { select: { id: true, nombre: true, apellido: true, hcpIndex: true } },
            },
          },
        },
      },
      scorecards: {
        orderBy: { id: 'asc' },
        include: {
          player: { select: { id: true, nombre: true, apellido: true } },
        },
      },
      _count: { select: { scorecards: true, teeTimeSlots: true } },
    },
  })

  if (!torneo) notFound()

  const canEdit = session.role === 'ADMIN' || session.role === 'COMISION'
  const isAdmin = session.role === 'ADMIN'

  const formatFecha = (d: Date) =>
    new Date(d).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const formatHora = (d: Date) =>
    new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  // Contar jugadores únicos inscritos en tee times
  const inscriptosIds = new Set(
    torneo.teeTimeSlots.flatMap((s) => s.players.map((p) => p.playerId))
  )

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/torneos" className="hover:text-green-700">Torneos</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">{torneo.nombre}</span>
      </div>

      {/* ── Header ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{torneo.nombre}</h1>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[torneo.status]}`}>
                {STATUS_LABEL[torneo.status]}
              </span>
            </div>
            <p className="text-gray-500 capitalize">{formatFecha(torneo.fecha)}</p>
          </div>

          {/* Acciones de estado */}
          <TorneoActions
            torneoId={torneo.id}
            status={torneo.status}
            canEdit={canEdit}
            isAdmin={isAdmin}
          />
        </div>

        {/* Detalles en fila */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoItem label="Tipo" value={TIPO_LABEL[torneo.tipo] ?? torneo.tipo} />
          <InfoItem label="Hoyos" value={torneo.hoyos === 'EIGHTEEN' ? '18 hoyos' : '9 hoyos'} />
          <InfoItem label="Ronda" value={torneo.ronda} />
          <InfoItem label="Cancha" value={torneo.course.nombre} />
          <InfoItem
            label="Tee Caballeros"
            value={torneo.teeHombre
              ? `${torneo.teeHombre.nombre}${torneo.teeHombre.slope ? ` · Slope ${torneo.teeHombre.slope}` : ''}`
              : '—'}
          />
          <InfoItem
            label="Tee Damas"
            value={torneo.teeDama
              ? `${torneo.teeDama.nombre}${torneo.teeDama.slope ? ` · Slope ${torneo.teeDama.slope}` : ''}`
              : '—'}
          />
        </div>

        {/* Flags */}
        <div className="mt-4 flex gap-4 text-xs text-gray-500">
          <span className={torneo.aagEnabled ? 'text-green-700 font-medium' : ''}>
            {torneo.aagEnabled ? '✓ Envío AAG activo' : '✗ Sin envío AAG'}
          </span>
          {torneo.scoreMaxMedal && <span>Tope de score máximo activo</span>}
          {torneo.nombrePlanilla && torneo.nombrePlanilla !== torneo.nombre && (
            <span>Planilla: {torneo.nombrePlanilla}</span>
          )}
        </div>
      </div>

      {/* ── Stats rápidas ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Inscriptos" value={inscriptosIds.size} icon="👤" />
        <StatCard label="Tee times" value={torneo._count.teeTimeSlots} icon="⏱️" />
        <StatCard label="Tarjetas" value={torneo._count.scorecards} icon="📋" />
      </div>

      {/* ── Contenido en dos columnas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda — Categorías + Acciones rápidas */}
        <div className="lg:col-span-1 space-y-6">

          {/* Categorías */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Categorías</h2>
            {torneo.categories.length === 0 ? (
              <p className="text-sm text-gray-400">Sin categorías definidas</p>
            ) : (
              <ul className="space-y-2">
                {torneo.categories.map((cat) => (
                  <li key={cat.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className={`font-medium ${cat.genero === 'DAMA' ? 'text-pink-700' : 'text-blue-700'}`}>
                        {cat.genero === 'DAMA' ? 'Damas' : 'Caballeros'}
                      </span>
                      <span className="text-gray-600 ml-1.5">{cat.nombre}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {cat.scratch
                        ? 'Scratch'
                        : cat.hcpHasta !== null
                        ? `HCP ≤ ${cat.hcpHasta}`
                        : 'Sin tope'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Acciones rápidas */}
          {canEdit && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Acciones</h2>
              <div className="space-y-2">
                <QuickLink
                  href={`/torneos/${torneo.id}/reservas`}
                  label="Gestionar reservas"
                  icon="⏱️"
                  description="Planilla de tee times"
                />
                <QuickLink
                  href={`/torneos/${torneo.id}/tarjetas`}
                  label="Cargar tarjetas"
                  icon="📋"
                  description="Hoyo por hoyo"
                />
                <QuickLink
                  href={`/torneos/${torneo.id}/resultados`}
                  label="Ver resultados"
                  icon="🏆"
                  description="Leaderboard"
                />
              </div>
            </section>
          )}
        </div>

        {/* Columna derecha — Planilla de tee times */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Planilla de reservas</h2>
              {canEdit && (
                <Link
                  href={`/torneos/${torneo.id}/reservas`}
                  className="text-xs text-green-600 hover:text-green-800 font-medium"
                >
                  Gestionar →
                </Link>
              )}
            </div>

            {torneo.teeTimeSlots.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400">
                <p className="text-2xl mb-1">⏱️</p>
                <p className="text-sm">No hay reservas cargadas</p>
                {canEdit && (
                  <Link
                    href={`/torneos/${torneo.id}/reservas`}
                    className="mt-3 inline-block text-xs text-green-600 hover:underline"
                  >
                    Crear planilla
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Hora</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap hidden sm:table-cell">Hoyo</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Jugadores</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {torneo.teeTimeSlots.map((slot) => (
                      <tr key={slot.id} className={`hover:bg-gray-50 transition-colors ${slot.bloqueado ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2.5 text-gray-700 font-mono whitespace-nowrap">
                          {formatHora(slot.hora)}
                          {slot.bloqueado && <span className="ml-1.5 text-xs text-gray-400">bloqueado</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">
                          Hoyo {slot.hoyoSalida}
                        </td>
                        <td className="px-4 py-2.5">
                          {slot.players.length === 0 ? (
                            <span className="text-gray-300 text-xs">Vacío</span>
                          ) : (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {slot.players.map((sp) => (
                                <span key={sp.id} className="text-gray-700">
                                  {sp.player.apellido}, {sp.player.nombre}
                                  <span className="text-gray-400 text-xs ml-1">({sp.player.hcpIndex})</span>
                                  {sp.carro && <span className="ml-1 text-xs text-yellow-600">🚗</span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Tarjetas presentadas */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Tarjetas presentadas</h2>
              {canEdit && (
                <Link
                  href={`/torneos/${torneo.id}/tarjetas`}
                  className="text-xs text-green-600 hover:text-green-800 font-medium"
                >
                  Cargar →
                </Link>
              )}
            </div>

            {torneo.scorecards.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400">
                <p className="text-2xl mb-1">📋</p>
                <p className="text-sm">No hay tarjetas cargadas</p>
                {canEdit && (
                  <Link
                    href={`/torneos/${torneo.id}/tarjetas`}
                    className="mt-3 inline-block text-xs text-green-600 hover:underline"
                  >
                    Cargar primera tarjeta
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Jugador</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 hidden sm:table-cell">Ronda</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600">AAG</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {torneo.scorecards.map((sc) => (
                    <tr key={sc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-800 font-medium">
                        {sc.player.apellido}, {sc.player.nombre}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-500 hidden sm:table-cell">
                        {sc.ronda}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {sc.aagSubmitted ? (
                          <span className="text-green-600 text-xs font-medium">✓ Enviada</span>
                        ) : (
                          <span className="text-gray-300 text-xs">Pendiente</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/torneos/${torneo.id}/tarjetas/${sc.id}`}
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
      <p className="text-2xl">{icon}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function QuickLink({ href, label, icon, description }: {
  href: string
  label: string
  icon: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-colors group"
    >
      <span className="text-lg">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 group-hover:text-green-800">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <span className="ml-auto text-gray-300 group-hover:text-green-600 text-sm">→</span>
    </Link>
  )
}
