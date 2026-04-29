import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const VOLUNTEER_COOKIE_NAME = 'volunteer_token'
const EXPIRY = '30d'

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export interface VolunteerSession {
  profileId: string
  email: string
}

export async function signVolunteerToken(profileId: string, email: string): Promise<string> {
  return new SignJWT({ profileId, email, role: 'volunteer' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function verifyVolunteerToken(token: string): Promise<VolunteerSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return { profileId: payload.profileId as string, email: payload.email as string }
  } catch {
    return null
  }
}

export async function getVolunteerSession(): Promise<VolunteerSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(VOLUNTEER_COOKIE_NAME)?.value
  if (!token) return null
  return verifyVolunteerToken(token)
}
