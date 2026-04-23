import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { Profile } from '@/lib/types'

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const { name, email, phone, role, task_ids } = await request.json()
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Namn och e-post krävs' }, { status: 400 })
  }

  const normalEmail = email.trim().toLowerCase()
  const normalRole = role === 'admin' ? 'admin' : 'volunteer'
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalEmail)
    .maybeSingle()

  let profileId: string

  if (existing) {
    profileId = existing.id
    await supabase.from('profiles').update({
      name: name.trim(),
      phone: phone?.trim() || null,
      role: normalRole,
    }).eq('id', profileId)
  } else {
    // Look up task titles so the trigger can match them
    const taskTitleRows: { email: string; task_title: string; name: string; phone: string | null; role: string }[] = []

    if (task_ids?.length > 0) {
      const { data: taskRows } = await supabase
        .from('tasks')
        .select('title')
        .in('id', task_ids)
      for (const t of taskRows ?? []) {
        taskTitleRows.push({ email: normalEmail, task_title: t.title, name: name.trim(), phone: phone?.trim() || null, role: normalRole })
      }
    }

    // Always insert at least one row so the trigger creates the profile
    if (taskTitleRows.length === 0) {
      taskTitleRows.push({ email: normalEmail, task_title: '', name: name.trim(), phone: phone?.trim() || null, role: normalRole })
    }

    await supabase
      .from('pending_assignments')
      .upsert(taskTitleRows, { onConflict: 'email,task_title' })

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalEmail,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    profileId = authData.user.id

    // Fallback: if the trigger didn't create the profile, create it manually
    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .maybeSingle()

    if (!prof) {
      await supabase.from('profiles').insert({
        id: profileId,
        email: normalEmail,
        name: name.trim(),
        phone: phone?.trim() || null,
        role: normalRole,
      })
    }
  }

  // Explicitly upsert task_assignments (belt-and-suspenders for new users,
  // required for existing users since trigger won't re-run)
  if (task_ids?.length > 0) {
    const rows = (task_ids as string[]).map((tid: string) => ({ task_id: tid, profile_id: profileId }))
    await supabase.from('task_assignments').upsert(rows, { onConflict: 'task_id,profile_id' })
  }

  const profile: Profile = {
    id: profileId,
    name: name.trim(),
    email: normalEmail,
    phone: phone?.trim() || null,
    role: normalRole,
  }

  return NextResponse.json({ ok: true, profile_id: profileId, profile })
}
