import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/session'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  }

  const result = await login(email, password)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 401 })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('golf_session')?.value ?? null
  let role: string | null = null
  if (token) {
    try { role = JSON.parse(Buffer.from(token, 'base64').toString()).role } catch {}
  }

  return NextResponse.json({ ok: true, token, role })
}
