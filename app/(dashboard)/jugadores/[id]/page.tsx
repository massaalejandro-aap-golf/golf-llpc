import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

const TIPO_LABEL: Record<string, string> = {
  SOCIO: 'Socio',
  INVITADO: 'Invitado',
  SOCIO_TEMPORARIO: 'Socio temporario',
  INVITADO_TEMPORARIO: 'Invitado temporario',
}

export default async function JugadorPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await requireSession()
  const canEdit = session.role === 'ADMIN' || session.role === 'COMISION'

  const jugador = await prisma.player.findUnique({
    where: { id: Number(id) },
    include: {
      scorecards: {
        orderBy: { id: 'desc' },
        take: 20,
        include: {
          tournament: { select: { id: true, nombre: true, fecha: true, tipo: true } },
          _count: { select: { entries: true } },
        },
      },
      teeTimeSlots: {
        orderBy: { teeTimeSlot: { hora: 'desc' } },
        take: 10,
        include: {
          teeTimeSlot: {
            include: {
              tournament: { select: { id: true, nombre: true, fecha: true } },
            },
          },
        },
      },
    },
  })

  if (!jugador) notFound()

  const genLabel = jugador.genero === 'DAMA' ? 'Dama' : 'Caballero'

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/jugadores" className="hover:text-green-700">Jugadores</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">
          {jugador.apellido}, {jugador.nombre}
        </span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {jugador.apellido}, {jugador.nombre}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {/* Matrícula — identificador principal */}
              {jugador.matricula ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  <span className="text-gray-400 font-normal text-xs">Mat.</span>
                  {jugador.matricula}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  Sin matrícula
                </span>
              )}
              <span className="text-gray-300">·</span>
              <span className={`text-sm ${jugador.genero === 'DAMA' ? 'text-pink-600' : 'text-blue-600'}`}>
                {genLabel}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-500">{TIPO_LABEL[jugador.tipo] ?? jugador.tipo}</span>
              {!jugador.activo && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactivo</span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            {/* HCP Index destacado */}
            <div className="text-center bg-green-50 rounded-xl px-6 py-3 border border-green-100">
              <p className="text-xs text-green-600 uppercase tracking-wide font-semibold">HCP Index</p>
              <p className="text-3xl font-bold text-green-800">{jugador.hcpIndex.toFixed(1)}</p>
            </div>
            {canEdit && (
              <Link
                href={`/jugadores/${jugador.id}/editar`}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Editar
              </Link>
            )}
          </div>
        </div>

        {/* Datos personales */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {jugador.dni && <InfoItem label="DNI" value={jugador.dni} />}
          {jugador.email && <InfoItem label="Email" value={jugador.email} />}
          {jugador.telefono && <InfoItem label="Teléfono" value={jugador.telefono} />}
          {jugador.categoria && <InfoItem label="Categoría socio" value={jugador.categoria} />}
          {jugador.centroCosto && <InfoItem label="Centro de costo" value={jugador.centroCosto} />}
          {jugador.fechaNac && (
            <InfoItem
              label="Fecha de nacimiento"
              value={new Date(jugador.fechaNac).toLocaleDateString('es-AR')}
            />
          )}
        </div>
      </div>

      {/* Torneos participados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Torneos recientes</h2>
        </div>

        {jugador.scorecards.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No hay tarjetas cargadas para este jugador.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Torneo</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden sm:table-cell">Fecha</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Hoyos</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600">AAG</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jugador.scorecards.map((sc) => (
                <tr key={sc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/torneos/${sc.tournament.id}`}
                      className="font-medium text-gray-900 hover:text-green-700"
                    >
                      {sc.tournament.nombre}
                    </Link>
                    <div className="text-xs text-gray-400">
                      {sc.tournament.tipo.replace(/_/g, ' ')}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell text-xs">
                    {new Date(sc.tournament.fecha).toLocaleDateString('es-AR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-500 text-xs">
                    {sc._count.entries}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {sc.aagSubmitted ? (
                      <span className="text-xs text-green-600 font-medium">✓</span>
                    ) : (
                      <span className="text-gray-200 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/torneos/${sc.tournament.id}/tarjetas/${sc.id}`}
                      className="text-xs text-green-600 hover:text-green-800"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}
