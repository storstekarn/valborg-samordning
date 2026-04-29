import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'E-postadress saknas.' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  console.log('[send-otp] Försöker skicka OTP till:', normalizedEmail)

  const adminClient = createAdminClient()

  const { data, error: lookupError } = await adminClient
    .from('pending_assignments')
    .select('email')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle()

  console.log('[send-otp] Lookup-resultat:', { data, error: lookupError?.message })

  if (lookupError) {
    console.error('[send-otp] Supabase-fel vid lookup:', lookupError)
    return NextResponse.json(
      { error: 'Serverfel vid kontroll av e-post. Försök igen.' },
      { status: 500 }
    )
  }

  if (!data) {
    console.warn('[send-otp] E-post ej funnen i pending_assignments:', normalizedEmail)
    return NextResponse.json(
      { error: 'Din e-postadress är inte registrerad.' },
      { status: 403 }
    )
  }

  // Utan emailRedirectTo skickar Supabase en 8-siffrig OTP-kod istället för magic link
  const { error: otpError } = await adminClient.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true,
    },
  })

  if (otpError) {
    console.error('[send-otp] signInWithOtp misslyckades:', otpError.message)
    return NextResponse.json(
      { error: 'Kunde inte skicka inloggningskod. Försök igen.' },
      { status: 500 }
    )
  }

  console.log('[send-otp] OTP-kod skickad till:', normalizedEmail)
  return NextResponse.json({ ok: true })
}
