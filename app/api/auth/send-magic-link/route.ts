import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'E-postadress saknas.' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  console.log('[send-magic-link] Försöker logga in:', normalizedEmail)

  // Admin-klient (service role, ingen cookie-inblandning) för DB-queryn
  const adminClient = createAdminClient()

  // Kontrollera att e-posten finns i pending_assignments
  const { data, error: lookupError } = await adminClient
    .from('pending_assignments')
    .select('email')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle()

  console.log('[send-magic-link] Query-resultat:', { data, error: lookupError?.message })

  if (lookupError) {
    console.error('[send-magic-link] Supabase-fel vid lookup:', lookupError)
    return NextResponse.json(
      { error: 'Serverfel vid kontroll av e-post. Försök igen.' },
      { status: 500 }
    )
  }

  if (!data) {
    console.warn('[send-magic-link] E-post ej funnen i pending_assignments:', normalizedEmail)
    return NextResponse.json(
      { error: 'Din e-postadress är inte registrerad.' },
      { status: 403 }
    )
  }

  // Skicka magic link via Supabase Auth
  const { error: otpError } = await adminClient.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      shouldCreateUser: true,
    },
  })

  if (otpError) {
    console.error('[send-magic-link] signInWithOtp misslyckades:', otpError.message)
    return NextResponse.json(
      { error: 'Kunde inte skicka inloggningslänk. Försök igen.' },
      { status: 500 }
    )
  }

  console.log('[send-magic-link] Magic link skickad till:', normalizedEmail)
  return NextResponse.json({ ok: true })
}
