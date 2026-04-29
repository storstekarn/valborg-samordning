import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Routes som aldrig redirectas oavsett session
const PUBLIC_ROUTES = ['/', '/auth/login']

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

async function verifyJwt(token: string) {
  const secret = getSecret()
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Publika routes – aldrig redirect
  if (PUBLIC_ROUTES.some(r => pathname === r)) {
    return NextResponse.next()
  }

  // Admin-skydd: /admin/** utom /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value
    if (!token) return NextResponse.redirect(new URL('/admin/login', request.url))
    const payload = await verifyJwt(token)
    if (!payload) return NextResponse.redirect(new URL('/admin/login', request.url))
    return NextResponse.next()
  }

  // Volontär-skydd: /dashboard, /messages, /incidents
  const volunteerProtected = ['/dashboard', '/messages', '/incidents']
  if (volunteerProtected.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    const token = request.cookies.get('volunteer_token')?.value
    if (!token) return NextResponse.redirect(new URL('/auth/login', request.url))
    const payload = await verifyJwt(token)
    if (!payload) return NextResponse.redirect(new URL('/auth/login', request.url))
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/).*)'],
}
