import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import NavLink from '@/components/NavLink'
import MisDatosForm from './MisDatosForm'

export const dynamic = 'force-dynamic'

export default async function MisDatosPage() {
  const session = await requireSession()

  if (!session.playerId) {
    return (
      <div className="flex flex-col min-h-screen">
        <MobileHeader />
        <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
          <div>
            <p className="text-4xl mb-4">⚠️</p>
            <p className="font-medium">Tu usuario no tiene un jugador asociado.</p>
            <p className="text-sm mt-2">Contactá al administrador del club.</p>
          </div>
        </div>
        <BackButton />
      </div>
    )
  }

  const player = await prisma.player.findUnique({
    where: { id: session.playerId },
    select: {
      id: true, nombre: true, apellido: true, matricula: true,
      hcpIndex: true, genero: true, tipo: true, categoria: true,
      email: true, telefono: true, dni: true, fechaNac: true, activo: true,
    },
  })

  if (!player) redirect('/mobile')

  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader />
      <div className="flex-1 px-4 py-5">
        <MisDatosForm player={{
          ...player,
          fechaNac: player.fechaNac?.toISOString() ?? null,
        }} />
      </div>
      <BackButton />
    </div>
  )
}

function MobileHeader() {
  return (
    <div className="bg-green-700 text-white px-6 pt-10 pb-6">
      <p className="text-green-200 text-sm font-medium tracking-wide uppercase">La Lucila Golf Club</p>
      <h1 className="text-xl font-bold mt-1">Mis datos</h1>
    </div>
  )
}

function BackButton() {
  return (
    <div className="p-4">
      <NavLink
        href="/mobile"
        className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-5 py-4 font-semibold active:scale-95 transition-transform"
      >
        ← Volver al menú
      </NavLink>
    </div>
  )
}
