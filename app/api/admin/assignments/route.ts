import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const { task_id, profile_id } = await request.json()
  if (!task_id || !profile_id) {
    return NextResponse.json({ error: 'task_id och profile_id krävs' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('task_assignments')
    .upsert({ task_id, profile_id }, { onConflict: 'task_id,profile_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const { task_id, profile_id } = await request.json()
  if (!task_id || !profile_id) {
    return NextResponse.json({ error: 'task_id och profile_id krävs' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('task_assignments')
    .delete()
    .eq('task_id', task_id)
    .eq('profile_id', profile_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
