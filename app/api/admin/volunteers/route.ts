import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { Profile, UserRole } from '@/lib/types'

export async function PATCH(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const { email, name, newEmail, phone } = await request.json()
  if (!email?.trim()) return NextResponse.json({ error: 'email krävs' }, { status: 400 })

  const oldEmail = (email as string).trim().toLowerCase()
  const updEmail = newEmail?.trim() ? (newEmail as string).trim().toLowerCase() : oldEmail
  const supabase = createAdminClient()

  // Uppdatera pending_assignments (alla rader för den e-posten)
  const { error: pendingErr } = await supabase
    .from('pending_assignments')
    .update({ email: updEmail, name: name?.trim() || null, phone: (phone as string | null)?.trim() || null })
    .eq('email', oldEmail)
  if (pendingErr) return NextResponse.json({ error: pendingErr.message }, { status: 500 })

  // Uppdatera invite_queue om den finns
  await supabase
    .from('invite_queue')
    .update({ email: updEmail, name: name?.trim() || null })
    .eq('email', oldEmail)

  // Uppdatera profiles om personen loggat in
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', oldEmail)
    .maybeSingle()
  if (profile) {
    await supabase
      .from('profiles')
      .update({ name: name?.trim() || null, phone: (phone as string | null)?.trim() || null })
      .eq('id', profile.id)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const { email } = await request.json()
  if (!email?.trim()) return NextResponse.json({ error: 'email krävs' }, { status: 400 })

  const normalEmail = (email as string).trim().toLowerCase()
  const supabase = createAdminClient()

  // Ta bort alla pending_assignments (uppgiftstilldelningar + profilrad)
  const { error: pendingErr } = await supabase
    .from('pending_assignments')
    .delete()
    .eq('email', normalEmail)
  if (pendingErr) return NextResponse.json({ error: pendingErr.message }, { status: 500 })

  // Ta bort från invite_queue
  await supabase
    .from('invite_queue')
    .delete()
    .eq('email', normalEmail)

  return NextResponse.json({ ok: true })
}

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const { name, email, phone, role, taskIds } = await request.json()
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Namn och e-post krävs' }, { status: 400 })
  }

  const normalEmail = email.trim().toLowerCase()
  const normalRole: UserRole = role === 'admin' ? 'admin' : 'volunteer'
  const supabase = createAdminClient()

  // Kolla om personen redan loggat in (finns i profiles)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalEmail)
    .maybeSingle()

  if (existing) {
    // Inloggad användare – uppdatera profil och task_assignments direkt
    await supabase.from('profiles').update({
      name: name.trim(),
      phone: phone?.trim() || null,
      role: normalRole,
    }).eq('id', existing.id)

    if ((taskIds as string[])?.length > 0) {
      const rows = (taskIds as string[]).map((tid: string) => ({ task_id: tid, profile_id: existing.id }))
      await supabase.from('task_assignments').upsert(rows, { onConflict: 'task_id,profile_id' })
    }

    const profile: Profile = {
      id: existing.id,
      name: name.trim(),
      email: normalEmail,
      phone: phone?.trim() || null,
      role: normalRole,
    }
    return NextResponse.json({ type: 'profile', profile_id: existing.id, profile })
  }

  // Inte inloggad – lägg till i pending_assignments (triggern skapar profil vid inloggning)
  const taskTitleRows: { email: string; task_title: string; name: string; phone: string | null }[] = []

  if ((taskIds as string[])?.length > 0) {
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('title')
      .in('id', taskIds as string[])
    for (const t of taskRows ?? []) {
      taskTitleRows.push({
        email: normalEmail,
        task_title: t.title,
        name: name.trim(),
        phone: phone?.trim() || null,
      })
    }
  }

  // Alltid minst en rad med tom task_title som profilinfo-bärare
  if (taskTitleRows.length === 0) {
    taskTitleRows.push({
      email: normalEmail,
      task_title: '',
      name: name.trim(),
      phone: phone?.trim() || null,
    })
  }

  await supabase
    .from('pending_assignments')
    .upsert(taskTitleRows, { onConflict: 'email,task_title' })

  // Lägg till i invite_queue om personen inte redan fått inbjudan
  await supabase
    .from('invite_queue')
    .upsert({ email: normalEmail, name: name.trim() }, { onConflict: 'email', ignoreDuplicates: true })

  return NextResponse.json({
    type: 'pending',
    email: normalEmail,
    name: name.trim(),
    phone: phone?.trim() || null,
    role: normalRole,
    taskIds: taskIds ?? [],
  })
}
