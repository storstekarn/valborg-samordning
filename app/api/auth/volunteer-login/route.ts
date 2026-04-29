import { createAdminClient } from '@/lib/supabase/admin'
import { signVolunteerToken, VOLUNTEER_COOKIE_NAME } from '@/lib/volunteerAuth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, code } = await request.json()

  if (!email || !code) {
    return NextResponse.json({ error: 'E-post och kod krävs.' }, { status: 400 })
  }

  const volunteerCode = process.env.VOLUNTEER_CODE
  if (!volunteerCode) {
    console.error('[volunteer-login] VOLUNTEER_CODE saknas i miljövariabler')
    return NextResponse.json({ error: 'Serverfel.' }, { status: 500 })
  }

  if (code !== volunteerCode) {
    console.warn('[volunteer-login] Fel kod angiven')
    return NextResponse.json({ error: 'Fel kod. Kontrollera koden och försök igen.' }, { status: 401 })
  }

  const normalizedEmail = (email as string).trim().toLowerCase()
  console.log('[volunteer-login] Försöker logga in:', normalizedEmail)
  console.log('[volunteer-login] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[volunteer-login] Service role key satt:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  const adminClient = createAdminClient()

  // Kontrollera att e-posten finns i pending_assignments
  const { data: pendingRows, error: pendingError } = await adminClient
    .from('pending_assignments')
    .select('name, phone, role, task_title')
    .ilike('email', normalizedEmail)

  console.log('[volunteer-login] pending_assignments query:', {
    email: normalizedEmail,
    rows: pendingRows?.length ?? 0,
    data: pendingRows,
    error: pendingError ? { message: pendingError.message, code: pendingError.code } : null,
  })

  if (pendingError) {
    console.error('[volunteer-login] Supabase-fel vid pending_assignments-sökning:', pendingError)
    return NextResponse.json({ error: 'Serverfel vid e-postkontroll.' }, { status: 500 })
  }

  if (!pendingRows || pendingRows.length === 0) {
    console.warn('[volunteer-login] E-post ej funnen i pending_assignments:', normalizedEmail)
    return NextResponse.json({ error: 'Din e-postadress är inte registrerad.' }, { status: 403 })
  }

  // Hämta befintlig profil
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, email')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  console.log('[volunteer-login] Profil-lookup:', {
    found: !!profile,
    profileId: profile?.id ?? null,
    error: profileError ? profileError.message : null,
  })

  let resolvedProfile = profile

  if (!resolvedProfile) {
    const name  = pendingRows.find(r => r.name)?.name   ?? null
    const phone = pendingRows.find(r => r.phone)?.phone  ?? null
    const role  = pendingRows.find(r => r.role)?.role    ?? 'volunteer'
    const newId = crypto.randomUUID()

    const { data: created, error: createErr } = await adminClient
      .from('profiles')
      .insert({ id: newId, email: normalizedEmail, name, phone, role })
      .select('id, email')
      .single()

    console.log('[volunteer-login] Skapade ny profil:', {
      id: newId,
      error: createErr ? createErr.message : null,
    })

    if (createErr || !created) {
      console.error('[volunteer-login] Kunde inte skapa profil:', createErr?.message)
      return NextResponse.json({ error: 'Serverfel vid profilskapande.' }, { status: 500 })
    }

    resolvedProfile = created

    // Skapa task_assignments (replikerar Supabase-triggern)
    const taskTitles = pendingRows.map(r => r.task_title).filter(Boolean) as string[]
    for (const title of taskTitles) {
      const { data: task } = await adminClient
        .from('tasks')
        .select('id')
        .ilike('title', title)
        .maybeSingle()
      if (task) {
        await adminClient
          .from('task_assignments')
          .upsert({ task_id: task.id, profile_id: newId }, { onConflict: 'task_id,profile_id' })
      }
    }
    console.log(`[volunteer-login] task_assignments skapade för ${taskTitles.length} uppgifter`)
  }

  const token = await signVolunteerToken(resolvedProfile.id, normalizedEmail)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(VOLUNTEER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  console.log(`[volunteer-login] OK: ${normalizedEmail} (profileId: ${resolvedProfile.id})`)
  return response
}
