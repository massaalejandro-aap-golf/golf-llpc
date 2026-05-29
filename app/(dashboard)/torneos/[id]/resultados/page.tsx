import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { TournamentType } from '@/app/generated/prisma/client'
import ResultadosTable from './ResultadosTable'

// ── Helpers de cálculo ────────────────────────────────────────────────────────

function courseHcp(hcpIndex: number, slope: number, rating: number, par: number): number {
  return Math.round(hcpIndex * slope / 113 + (rating - par))
}

function strokesOnHole(chcp: number, si: number, totalHoles: number): number {
  const full = Math.floor(chcp / totalHoles)
  const remainder = chcp % totalHoles
  return full + (si <= remainder ? 1 : 0)
}

function stablefordPts(gross: number, par: number, strokes: number): number {
  return Math.max(0, par + strokes + 2 - gross)
}

type HoleScore = { numero: number; golpes: number }

/**
 * Neto de los últimos N hoyos: gross_lastN - chcp/divisor
 * Ej: últimos 9 → divisor=2, últimos 6 → divisor=3, últimos 3 → divisor=6, último → divisor=18
 */
function lastNNeto(holeScores: HoleScore[], n: number, chcp: number, divisor: number): number {
  const last = holeScores.slice(-Math.min(n, holeScores.length))
  return last.reduce((s, h) => s + h.golpes, 0) - chcp / divisor
}

/** Gross de los últimos N hoyos (para desempate scratch) */
function lastNGross(holeScores: HoleScore[], n: number): number {
  const last = holeScores.slice(-Math.min(n, holeScores.length))
  return last.reduce((s, h) => s + h.golpes, 0)
}

// ── Tipos internos ────────────────────────────────────────────────────────────

interface HoleData {
  id: number
  numero: number
  par: number
  handicapIndex: number
}

interface PlayerResult {
  playerId: number
  nombre: string
  apellido: string
  hcpIndex: number
  genero: string
  chcp: number
  ida: number | null
  vuelta: number | null
  gross: number | null
  neto: number | null
  stableford: number | null
  holesPlayed: number
  holeScores: HoleScore[]   // ordenados por numero asc — para desempate
  categoryName: string
  categoryGenero: string
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function ResultadosPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  await requireSession()

  const torneo = await prisma.tournament.findUnique({
    where: { id: Number(id) },
    include: {
      course: { include: { holes: { orderBy: { numero: 'asc' } } } },
      teeHombre: { select: { slope: true, rating: true } },
      teeDama:   { select: { slope: true, rating: true } },
      categories: { orderBy: [{ genero: 'asc' }, { nombre: 'asc' }] },
      scorecards: {
        include: {
          player: {
            select: { id: true, nombre: true, apellido: true, hcpIndex: true, genero: true },
          },
          entries: {
            include: { hole: { select: { id: true, numero: true, par: true, handicapIndex: true } } },
            orderBy: { hole: { numero: 'asc' } },
          },
        },
      },
    },
  })

  if (!torneo) notFound()

  const isEighteen = torneo.hoyos === 'EIGHTEEN'
  const totalHoles = isEighteen ? 18 : 9
  const holes: HoleData[] = isEighteen
    ? torneo.course.holes
    : torneo.course.holes.filter((h) => h.numero <= 9)

  const parTotal = holes.reduce((a, h) => a + h.par, 0)
  const isStableford = torneo.tipo === TournamentType.STABLEFORD

  // ── Calcular resultado de cada tarjeta ────────────────────────────────────

  const results: PlayerResult[] = torneo.scorecards.map((sc) => {
    const player = sc.player
    const tee = player.genero === 'DAMA'
      ? (torneo.teeDama ?? torneo.teeHombre)
      : (torneo.teeHombre ?? torneo.teeDama)
    const slope  = tee?.slope  ?? 113
    const rating = tee?.rating ?? 72
    const chcp = courseHcp(player.hcpIndex, slope, rating, parTotal)

    const scoreMap = new Map(sc.entries.map((e) => [e.hole.numero, { golpes: e.golpes, hole: e.hole }]))

    let ida = 0, vuelta = 0
    let stablefordTotal = 0
    let holesPlayed = 0
    const holeScores: HoleScore[] = []

    for (const hole of holes) {
      const entry = scoreMap.get(hole.numero)
      if (!entry) continue

      const gross = entry.golpes
      const strokes = strokesOnHole(chcp, hole.handicapIndex, totalHoles)

      if (hole.numero <= 9) ida += gross
      else vuelta += gross

      holesPlayed++
      holeScores.push({ numero: hole.numero, golpes: gross })
      stablefordTotal += stablefordPts(gross, hole.par, strokes)
    }

    const gross = holesPlayed > 0 ? (isEighteen ? ida + vuelta : ida) : null
    const neto = gross !== null ? gross - chcp : null

    // Asignar categoría — excluir scratch (se agregan aparte)
    const category = torneo.categories.find(
      (c) =>
        !c.scratch &&
        c.genero === player.genero &&
        (c.hcpHasta === null || player.hcpIndex <= c.hcpHasta) &&
        (c.hcpDesde === null || player.hcpIndex >= c.hcpDesde)
    ) ?? torneo.categories.find((c) => !c.scratch && c.genero === player.genero)

    return {
      playerId: player.id,
      nombre: player.nombre,
      apellido: player.apellido,
      hcpIndex: player.hcpIndex,
      genero: player.genero,
      chcp,
      ida: holesPlayed >= 9 ? ida : null,
      vuelta: isEighteen && holesPlayed >= 18 ? vuelta : null,
      gross,
      neto,
      stableford: stablefordTotal > 0 ? stablefordTotal : null,
      holesPlayed,
      holeScores,
      categoryName: category?.nombre ?? 'Sin categoría',
      categoryGenero: category?.genero ?? player.genero,
    }
  })

  // ── Agrupar por categoría y ordenar ──────────────────────────────────────

  const grouped = new Map<string, PlayerResult[]>()

  for (const r of results) {
    const key = `${r.categoryGenero}__${r.categoryName}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }

  // Ordenar dentro de cada categoría
  for (const [, group] of grouped) {
    group.sort((a, b) => {
      if (isStableford) {
        return (b.stableford ?? -1) - (a.stableford ?? -1)
      }
      // Sin tarjeta al final
      if (a.neto === null && b.neto === null) return a.apellido.localeCompare(b.apellido)
      if (a.neto === null) return 1
      if (b.neto === null) return -1
      if (a.neto !== b.neto) return a.neto - b.neto
      // Desempate neto: últimos 9 (÷2), 6 (÷3), 3 (÷6), 1 (÷18)
      for (const [n, div] of [[9, 2], [6, 3], [3, 6], [1, 18]] as const) {
        const diff = lastNNeto(a.holeScores, n, a.chcp, div)
                   - lastNNeto(b.holeScores, n, b.chcp, div)
        if (Math.abs(diff) > 0.0001) return diff
      }
      return a.apellido.localeCompare(b.apellido)
    })
  }

  // Grupos scratch: todos los jugadores del género, ordenados por gross
  const scratchCategories = torneo.categories.filter((c) => c.scratch)
  const scratchGroups = new Map<string, { genero: string; catNombre: string; players: PlayerResult[] }>()
  for (const cat of scratchCategories) {
    const players = results
      .filter((r) => r.genero === cat.genero && r.gross !== null)
      .sort((a, b) => {
        if (a.gross !== b.gross) return (a.gross ?? 999) - (b.gross ?? 999)
        // Desempate scratch: últimos 9, 6, 3, 1 gross
        for (const n of [9, 6, 3, 1]) {
          const diff = lastNGross(a.holeScores, n) - lastNGross(b.holeScores, n)
          if (diff !== 0) return diff
        }
        return a.apellido.localeCompare(b.apellido)
      })
    const key = `scratch__${cat.genero}__${cat.nombre}`
    scratchGroups.set(key, { genero: cat.genero, catNombre: cat.nombre, players })
  }

  // ── Orden de renderizado: scratch primero, luego por HCP asc dentro de cada género ──

  type RenderItem =
    | { kind: 'regular'; key: string; group: PlayerResult[]; genero: string; catNombre: string; hcpDesde: number; hcpHasta: number }
    | { kind: 'scratch'; genero: string; catNombre: string; players: PlayerResult[] }

  const renderItems: RenderItem[] = [
    ...Array.from(grouped.entries()).map(([key, group]) => {
      const [genero, catNombre] = key.split('__')
      const cat = torneo.categories.find(
        (c) => !c.scratch && c.genero === genero && c.nombre === catNombre
      )
      return {
        kind:      'regular' as const,
        key, group, genero, catNombre,
        hcpDesde:  cat?.hcpDesde ?? 0,
        hcpHasta:  cat?.hcpHasta ?? 999,
      }
    }),
    ...Array.from(scratchGroups.values()).map(({ genero, catNombre, players }) => ({
      kind: 'scratch' as const,
      genero, catNombre, players,
    })),
  ]

  renderItems.sort((a, b) => {
    // 1° género: CABALLERO (C) antes que DAMA (D)
    if (a.genero !== b.genero) return a.genero.localeCompare(b.genero)
    // 2° scratch primero
    const aScratch = a.kind === 'scratch' ? 0 : 1
    const bScratch = b.kind === 'scratch' ? 0 : 1
    if (aScratch !== bScratch) return aScratch - bScratch
    // 3° regular: menor HCP primero
    if (a.kind === 'regular' && b.kind === 'regular') {
      if (a.hcpDesde !== b.hcpDesde) return a.hcpDesde - b.hcpDesde
      return a.hcpHasta - b.hcpHasta
    }
    return 0
  })

  const tipoLabel = torneo.tipo.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/torneos" className="hover:text-green-700">Torneos</Link>
        <span>/</span>
        <Link href={`/torneos/${torneo.id}`} className="hover:text-green-700 truncate max-w-[200px]">
          {torneo.nombre}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Resultados</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {torneo.nombre} · {tipoLabel} · {totalHoles} hoyos ·{' '}
            {new Date(torneo.fecha).toLocaleDateString('es-AR', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}
          </p>
        </div>
        <Link href={`/torneos/${torneo.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Torneo
        </Link>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">🏆</p>
          <p>No hay tarjetas cargadas aún.</p>
          <Link href={`/torneos/${torneo.id}/tarjetas`} className="mt-2 inline-block text-xs text-green-600 hover:underline">
            Cargar tarjetas
          </Link>
        </div>
      ) : (
        <ResultadosTable
          renderItems={renderItems}
          holes={holes}
          isEighteen={isEighteen}
          isStableford={isStableford}
          totalHoles={totalHoles}
          torneoId={torneo.id}
        />
      )}
    </div>
  )
}
