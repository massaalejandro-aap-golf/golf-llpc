import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  }

  const result = await login(email, password)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
