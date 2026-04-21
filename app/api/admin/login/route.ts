import { NextResponse } from 'next/server'
import { signAdminToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  const validEmail = process.env.SUPERADMIN_EMAIL
  const validPassword = process.env.SUPERADMIN_PASSWORD

  if (!validEmail || !validPassword) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (email !== validEmail || password !== validPassword) {
    return NextResponse.json({ error: 'Felaktiga uppgifter' }, { status: 401 })
  }

  const token = await signAdminToken()

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24h
    path: '/',
  })

  return response
}
