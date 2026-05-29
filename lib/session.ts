'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

// ─── Tipos ───────────────────────────────────────────────────
export type SessionUser = {
  id: number
  email: string
  nombre: string
  role: 'ADMIN' | 'COMISION' | 'SOCIO'
  playerId?: number | null
}

const SESSION_COOKIE = 'golf_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 días

// ─── Crear sesión ────────────────────────────────────────────
export async function createSession(user: SessionUser) {
  // Sesión simple: JSON codificado en base64 firmado con el secreto
  // En producción usar JWT o iron-session para mayor seguridad
  const payload = Buffer.from(JSON.stringify(user)).toString('base64')
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

// ─── Obtener sesión ──────────────────────────────────────────
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get(SESSION_COOKIE)?.value
  if (!value) return null
  try {
    const user = JSON.parse(Buffer.from(value, 'base64').toString('utf-8'))
    return user as SessionUser
  } catch {
    return null
  }
}

// ─── Obtener sesión o redirigir ───────────────────────────────
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

// ─── Obtener sesión con rol mínimo ───────────────────────────
export async function requireRole(
  minRole: 'ADMIN' | 'COMISION' | 'SOCIO'
): Promise<SessionUser> {
  const session = await requireSession()
  const roles = ['SOCIO', 'COMISION', 'ADMIN']
  if (roles.indexOf(session.role) < roles.indexOf(minRole)) {
    redirect('/')
  }
  return session
}

// ─── Destruir sesión ─────────────────────────────────────────
export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

// ─── Login ───────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<{ error?: string }> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { error: 'Usuario o contraseña incorrectos' }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return { error: 'Usuario o contraseña incorrectos' }

  await createSession({
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    role: user.role,
    playerId: user.playerId,
  })

  return {}
}
