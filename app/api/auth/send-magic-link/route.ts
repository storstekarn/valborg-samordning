import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'E-postadress saknas.' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const supabase = await createServiceClient()

  // Kontrollera att e-posten finns i pending_assignments.
  // ilike = case-insensitiv matchning (ILIKE i PostgreSQL).
  // maybeSingle() returnerar null vid noll träffar utan att sätta error.
  const { data } = await supabase
    .from('pending_assignments')
    .select('email')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle()

  if (!data) {
    return NextResponse.json(
      { error: 'Din e-postadress är inte registrerad.' },
      { status: 403 }
    )
  }

  // Skicka magic link via Supabase Auth (Supabase hanterar mejlutskick via Resend)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (otpError) {
    return NextResponse.json(
      { error: 'Kunde inte skicka inloggningslänk. Försök igen.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
