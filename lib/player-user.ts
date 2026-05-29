import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

/**
 * Crea un User con rol SOCIO para un Player si aún no tiene uno.
 * username/password = matrícula del jugador.
 * No hace nada si el player no tiene matrícula o ya tiene User.
 */
export async function ensurePlayerUser(player: {
  id: number
  matricula: string | null
  nombre: string
  apellido: string
}): Promise<void> {
  if (!player.matricula) return

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: player.matricula }, { playerId: player.id }] },
  })
  if (existing) return

  const hashed = await bcrypt.hash(player.matricula, 10)
  await prisma.user.create({
    data: {
      email: player.matricula,
      password: hashed,
      nombre: `${player.apellido}, ${player.nombre}`,
      role: 'SOCIO',
      playerId: player.id,
    },
  })
}
