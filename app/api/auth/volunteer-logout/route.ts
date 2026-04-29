import { VOLUNTEER_COOKIE_NAME } from '@/lib/volunteerAuth'
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(VOLUNTEER_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' })
  return response
}
