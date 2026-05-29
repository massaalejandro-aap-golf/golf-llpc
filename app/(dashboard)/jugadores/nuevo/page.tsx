import Link from 'next/link'
import { requireRole } from '@/lib/session'
import JugadorForm from '../JugadorForm'

export default async function NuevoJugadorPage({
  searchParams,
}: {
  searchParams: Promise<{ matricula?: string; nombre?: string; apellido?: string; genero?: string; hcp?: string }>
}) {
  await requireRole('COMISION')
  const { matricula, nombre, apellido, genero, hcp } = await searchParams
  const mat = matricula?.trim().match(/^\d{3,8}$/) ? matricula.trim() : undefined

  // Si venimos desde AAGBuscador con datos pre-cargados, los usamos directamente
  // (TypeScript infiere los tipos correctamente dentro del branch del &&)
  const initial = mat && nombre && apellido
    ? {
        matricula:  mat,
        nombre:     nombre.trim(),
        apellido:   apellido.trim(),
        genero:     (genero === 'DAMA' || genero === 'CABALLERO' ? genero : 'CABALLERO') as 'DAMA' | 'CABALLERO',
        hcpIndex:   hcp ? Number(hcp) : 0,
      }
    : undefined

  // Solo auto-buscar en AAG si no tenemos datos pre-cargados
  const autoFetch = initial ? undefined : mat

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/jugadores" className="hover:text-green-700">Jugadores</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Nuevo jugador</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo jugador</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {autoFetch
            ? `Cargando datos de AAG para matrícula ${autoFetch}…`
            : 'Completá los datos del jugador'}
        </p>
      </div>

      <JugadorForm mode="create" autoFetchMatricula={autoFetch} initial={initial} />
    </div>
  )
}
