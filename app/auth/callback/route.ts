import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Använd NEXT_PUBLIC_SITE_URL i produktion för att undvika
  // http/https-mismatch bakom Railway-proxy
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  if (!code) {
    console.error('[auth/callback] Ingen code-parameter i URL:', request.url)
    return NextResponse.redirect(`${siteUrl}/auth/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession misslyckades:', error.message)
    return NextResponse.redirect(`${siteUrl}/auth/login?error=exchange_failed`)
  }

  console.log('[auth/callback] Session skapad, redirectar till /dashboard')
  return NextResponse.redirect(`${siteUrl}/dashboard`)
}
