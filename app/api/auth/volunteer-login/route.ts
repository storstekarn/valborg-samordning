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
    return NextResponse.json({ error: 'Fel kod. Kontrollera koden och försök igen.' }, { status: 401 })
  }

  const normalizedEmail = (email as string).trim().toLowerCase()
  const adminClient = createAdminClient()

  // Kontrollera att e-posten finns i pending_assignments
  const { data: pendingRows } = await adminClient
    .from('pending_assignments')
    .select('name, phone, role, task_title')
    .ilike('email', normalizedEmail)

  if (!pendingRows || pendingRows.length === 0) {
    return NextResponse.json({ error: 'Din e-postadress är inte registrerad.' }, { status: 403 })
  }

  // Hämta befintlig profil
  let { data: profile } = await adminClient
    .from('profiles')
    .select('id, email')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (!profile) {
    // Skapa ny profil med namn/telefon/roll från pending_assignments
    const name  = pendingRows.find(r => r.name)?.name   ?? null
    const phone = pendingRows.find(r => r.phone)?.phone  ?? null
    const role  = pendingRows.find(r => r.role)?.role    ?? 'volunteer'
    const newId = crypto.randomUUID()

    const { data: created, error: createErr } = await adminClient
      .from('profiles')
      .insert({ id: newId, email: normalizedEmail, name, phone, role })
      .select('id, email')
      .single()

    if (createErr || !created) {
      console.error('[volunteer-login] Kunde inte skapa profil:', createErr?.message)
      return NextResponse.json({ error: 'Serverfel vid profilskapande.' }, { status: 500 })
    }

    profile = created

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

    console.log(`[volunteer-login] Ny profil skapad: ${normalizedEmail} (${newId})`)
  }

  const token = await signVolunteerToken(profile.id, normalizedEmail)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(VOLUNTEER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  console.log(`[volunteer-login] Inloggad: ${normalizedEmail} (profileId: ${profile.id})`)
  return response
}
