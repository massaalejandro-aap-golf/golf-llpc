import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import JugadorForm from '../../JugadorForm'

export default async function EditarJugadorPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  await requireRole('COMISION')

  const jugador = await prisma.player.findUnique({ where: { id: Number(id) } })
  if (!jugador) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/jugadores" className="hover:text-green-700">Jugadores</Link>
        <span>/</span>
        <Link href={`/jugadores/${jugador.id}`} className="hover:text-green-700">
          {jugador.apellido}, {jugador.nombre}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Editar</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar jugador</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {jugador.apellido}, {jugador.nombre}
        </p>
      </div>

      <JugadorForm
        mode="edit"
        jugadorId={jugador.id}
        initial={{
          nombre:      jugador.nombre,
          apellido:    jugador.apellido,
          genero:      jugador.genero,
          hcpIndex:    jugador.hcpIndex,
          tipo:        jugador.tipo,
          matricula:   jugador.matricula ?? '',
          email:       jugador.email ?? '',
          telefono:    jugador.telefono ?? '',
          dni:         jugador.dni ?? '',
          fechaNac:    jugador.fechaNac
            ? new Date(jugador.fechaNac).toISOString().split('T')[0]
            : '',
          categoria:   jugador.categoria ?? '',
          centroCosto: jugador.centroCosto ?? '',
          activo:      jugador.activo,
        }}
      />
    </div>
  )
}
