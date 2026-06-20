/**
 * lib/leaderboard.ts
 *
 * Cálculo del leaderboard de un torneo.
 * Usado tanto por el API route como por el Server Component de /leaderboard.
 */

import { prisma } from '@/lib/prisma'
import { TournamentType } from '@/app/generated/prisma/client'

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type HoleScore = { numero: number; golpes: number; par: number; si: number }

export type LeaderboardPlayer = {
  playerId:    number
  nombre:      string
  apellido:    string
  hcpIndex:    number
  chcp:        number
  ida:         number | null
  vuelta:      number | null
  gross:       number | null
  neto:        number | null
  stableford:  number | null
  holesPlayed: number
  totalHoles:  number
  holeScores:  HoleScore[]
}

export type LeaderboardGroup = {
  kind:      'regular' | 'scratch'
  genero:    string
  catNombre: string
  hcpDesde?: number
  hcpHasta?: number
  players:   LeaderboardPlayer[]
}

export type LeaderboardResponse = {
  torneo: {
    id:     number
    nombre: string
    fecha:  string
    tipo:   string
    hoyos:  string
    holes:  { numero: number; par: number; si: number }[]
  }
  isEighteen:   boolean
  isStableford: boolean
  groups:       LeaderboardGroup[]
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function courseHcp(hcpIndex: number, slope: number, rating: number, par: number): number {
  return Math.round(hcpIndex * slope / 113 + (rating - par))
}

function strokesOnHole(chcp: number, si: number, totalHoles: number): number {
  const full = Math.floor(chcp / totalHoles)
  return full + (si <= chcp % totalHoles ? 1 : 0)
}

function stablefordPts(gross: number, par: number, strokes: number): number {
  return Math.max(0, par + strokes + 2 - gross)
}

type InternalHoleScore = { numero: number; golpes: number; par: number; si: number }

function lastNNeto(hs: InternalHoleScore[], n: number, chcp: number, divisor: number): number {
  const last = hs.slice(-Math.min(n, hs.length))
  return last.reduce((s, h) => s + h.golpes, 0) - chcp / divisor
}

function lastNGross(hs: InternalHoleScore[], n: number): number {
  const last = hs.slice(-Math.min(n, hs.length))
  return last.reduce((s, h) => s + h.golpes, 0)
}

// ── Función principal ─────────────────────────────────────────────────────────

export async function computeLeaderboard(id: number): Promise<LeaderboardResponse | null> {
  const torneo = await prisma.tournament.findUnique({
    where: { id },
    include: {
      course:    { include: { holes: { orderBy: { numero: 'asc' } } } },
      teeHombre: { select: { slope: true, rating: true } },
      teeDama:   { select: { slope: true, rating: true } },
      categories:{ orderBy: [{ genero: 'asc' }, { nombre: 'asc' }] },
      scorecards: {
        where: { ronda: 1 }, // ronda=2 son tarjetas de control YO, nunca van al leaderboard
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

  if (!torneo) return null

  const isEighteen   = torneo.hoyos === 'EIGHTEEN'
  const totalHoles   = isEighteen ? 18 : 9
  const isStableford = torneo.tipo === TournamentType.STABLEFORD
  const holes = isEighteen
    ? torneo.course.holes
    : torneo.course.holes.filter((h) => h.numero <= 9)
  const parTotal = holes.reduce((a, h) => a + h.par, 0)

  // ── Calcular por tarjeta ────────────────────────────────────────────────────

  type InternalResult = Omit<LeaderboardPlayer, 'holeScores'> & {
    genero:         string
    categoryName:   string
    categoryGenero: string
    holeScores:     InternalHoleScore[]
  }

  const results: InternalResult[] = torneo.scorecards.map((sc) => {
    const player = sc.player
    const tee = player.genero === 'DAMA'
      ? (torneo.teeDama ?? torneo.teeHombre)
      : (torneo.teeHombre ?? torneo.teeDama)
    const slope  = tee?.slope  ?? 113
    const rating = tee?.rating ?? 72
    const chcp   = courseHcp(player.hcpIndex, slope, rating, parTotal)

    const scoreMap = new Map(sc.entries.map((e) => [e.hole.numero, e]))
    let ida = 0, vuelta = 0, stablefordTotal = 0, holesPlayed = 0
    const holeScores: HoleScore[] = []

    for (const hole of holes) {
      const entry = scoreMap.get(hole.numero)
      if (!entry) continue
      const gross   = entry.golpes
      const strokes = strokesOnHole(chcp, hole.handicapIndex, totalHoles)
      if (hole.numero <= 9) ida += gross; else vuelta += gross
      holesPlayed++
      holeScores.push({ numero: hole.numero, golpes: gross, par: hole.par, si: hole.handicapIndex })
      stablefordTotal += stablefordPts(gross, hole.par, strokes)
    }

    const gross = holesPlayed > 0 ? (isEighteen ? ida + vuelta : ida) : null
    const neto  = gross !== null ? gross - chcp : null

    const category = torneo.categories.find(
      (c) =>
        !c.scratch &&
        c.genero === player.genero &&
        (c.hcpHasta === null || player.hcpIndex <= c.hcpHasta) &&
        (c.hcpDesde === null || player.hcpIndex >= c.hcpDesde)
    ) ?? torneo.categories.find((c) => !c.scratch && c.genero === player.genero)

    return {
      playerId:       player.id,
      nombre:         player.nombre,
      apellido:       player.apellido,
      hcpIndex:       player.hcpIndex,
      genero:         player.genero,
      chcp,
      ida:            holesPlayed >= 9 ? ida : null,
      vuelta:         isEighteen && holesPlayed >= 18 ? vuelta : null,
      gross,
      neto,
      stableford:     stablefordTotal > 0 ? stablefordTotal : null,
      holesPlayed,
      totalHoles,
      holeScores,
      categoryName:   category?.nombre ?? 'Sin categoría',
      categoryGenero: category?.genero ?? player.genero,
    }
  })

  // ── Agrupar y ordenar ───────────────────────────────────────────────────────

  const grouped = new Map<string, InternalResult[]>()
  for (const r of results) {
    const key = `${r.categoryGenero}__${r.categoryName}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }

  for (const [, group] of grouped) {
    group.sort((a, b) => {
      if (isStableford) return (b.stableford ?? -1) - (a.stableford ?? -1)
      if (a.neto === null && b.neto === null) return a.apellido.localeCompare(b.apellido)
      if (a.neto === null) return 1
      if (b.neto === null) return -1
      if (a.neto !== b.neto) return a.neto - b.neto
      for (const [n, div] of [[9, 2], [6, 3], [3, 6], [1, 18]] as const) {
        const diff = lastNNeto(a.holeScores, n, a.chcp, div)
                   - lastNNeto(b.holeScores, n, b.chcp, div)
        if (Math.abs(diff) > 0.0001) return diff
      }
      return a.apellido.localeCompare(b.apellido)
    })
  }

  const scratchCategories = torneo.categories.filter((c) => c.scratch)
  const scratchGroups = new Map<string, { genero: string; catNombre: string; players: InternalResult[] }>()
  for (const cat of scratchCategories) {
    const players = results
      .filter((r) => r.genero === cat.genero && r.gross !== null)
      .sort((a, b) => {
        if (a.gross !== b.gross) return (a.gross ?? 999) - (b.gross ?? 999)
        for (const n of [9, 6, 3, 1]) {
          const diff = lastNGross(a.holeScores, n) - lastNGross(b.holeScores, n)
          if (diff !== 0) return diff
        }
        return a.apellido.localeCompare(b.apellido)
      })
    scratchGroups.set(`scratch__${cat.genero}`, { genero: cat.genero, catNombre: cat.nombre, players })
  }

  type RenderItem =
    | { kind: 'regular'; key: string; group: InternalResult[]; genero: string; catNombre: string; hcpDesde: number; hcpHasta: number }
    | { kind: 'scratch'; genero: string; catNombre: string; players: InternalResult[] }

  const renderItems: RenderItem[] = [
    ...Array.from(grouped.entries()).map(([key, group]) => {
      const [genero, catNombre] = key.split('__')
      const cat = torneo.categories.find((c) => !c.scratch && c.genero === genero && c.nombre === catNombre)
      return { kind: 'regular' as const, key, group, genero, catNombre, hcpDesde: cat?.hcpDesde ?? 0, hcpHasta: cat?.hcpHasta ?? 999 }
    }),
    ...Array.from(scratchGroups.values()).map(({ genero, catNombre, players }) => ({
      kind: 'scratch' as const, genero, catNombre, players,
    })),
  ]

  renderItems.sort((a, b) => {
    if (a.genero !== b.genero) return a.genero.localeCompare(b.genero)
    const aScratch = a.kind === 'scratch' ? 0 : 1
    const bScratch = b.kind === 'scratch' ? 0 : 1
    if (aScratch !== bScratch) return aScratch - bScratch
    if (a.kind === 'regular' && b.kind === 'regular') {
      if (a.hcpDesde !== b.hcpDesde) return a.hcpDesde - b.hcpDesde
      return a.hcpHasta - b.hcpHasta
    }
    return 0
  })

  // ── Construir respuesta (sin holeScores internos) ───────────────────────────

  const groups: LeaderboardGroup[] = renderItems.map((item) => {
    if (item.kind === 'scratch') {
      return {
        kind:      'scratch',
        genero:    item.genero,
        catNombre: item.catNombre,
        players:   item.players.map(
          ({ genero: _g, categoryName: _cn, categoryGenero: _cg, ...p }) => p
        ),
      }
    }
    return {
      kind:      'regular',
      genero:    item.genero,
      catNombre: item.catNombre,
      hcpDesde:  item.hcpDesde,
      hcpHasta:  item.hcpHasta,
      players:   item.group.map(
        ({ genero: _g, categoryName: _cn, categoryGenero: _cg, ...p }) => p
      ),
    }
  })

  return {
    torneo: {
      id:     torneo.id,
      nombre: torneo.nombre,
      fecha:  torneo.fecha.toISOString(),
      tipo:   torneo.tipo,
      hoyos:  torneo.hoyos,
      holes:  holes.map((h) => ({ numero: h.numero, par: h.par, si: h.handicapIndex })),
    },
    isEighteen,
    isStableford,
    groups,
  }
}
