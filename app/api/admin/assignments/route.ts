import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const { task_id, profile_id, email } = await request.json()
  if (!task_id) return NextResponse.json({ error: 'task_id krävs' }, { status: 400 })

  const supabase = createAdminClient()

  if (profile_id) {
    const { error } = await supabase
      .from('task_assignments')
      .upsert({ task_id, profile_id }, { onConflict: 'task_id,profile_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (email) {
    const normalEmail = (email as string).toLowerCase()

    const { data: task } = await supabase
      .from('tasks').select('title').eq('id', task_id).single()
    if (!task) return NextResponse.json({ error: 'Uppgift hittades inte' }, { status: 404 })

    // Hämta befintlig volontärinfo för att bevara name/phone/role
    const { data: existing } = await supabase
      .from('pending_assignments')
      .select('name, phone, role')
      .eq('email', normalEmail)
      .limit(1)
      .maybeSingle()

    const { error } = await supabase
      .from('pending_assignments')
      .upsert({
        email: normalEmail,
        task_title: task.title,
        name: existing?.name ?? null,
        phone: existing?.phone ?? null,
        role: existing?.role ?? 'volunteer',
      }, { onConflict: 'email,task_title' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'profile_id eller email krävs' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const { task_id, profile_id, email } = await request.json()
  if (!task_id) return NextResponse.json({ error: 'task_id krävs' }, { status: 400 })

  const supabase = createAdminClient()

  if (profile_id) {
    const { error } = await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', task_id)
      .eq('profile_id', profile_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (email) {
    const normalEmail = (email as string).toLowerCase()

    const { data: task } = await supabase
      .from('tasks').select('title').eq('id', task_id).single()
    if (!task) return NextResponse.json({ error: 'Uppgift hittades inte' }, { status: 404 })

    const { error } = await supabase
      .from('pending_assignments')
      .delete()
      .eq('email', normalEmail)
      .eq('task_title', task.title)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'profile_id eller email krävs' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
