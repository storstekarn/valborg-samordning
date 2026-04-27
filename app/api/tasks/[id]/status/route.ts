import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TaskStatus } from '@/lib/types'

const VALID_STATUSES: TaskStatus[] = ['ej_startad', 'pågår', 'klar']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status } = await request.json() as { status: TaskStatus }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Ogiltig status' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  // Profil måste finnas – annars är sessionen skapad men trigger har inte kört än
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json(
      { error: 'Din profil är inte klar än, försök logga ut och in igen' },
      { status: 403 }
    )
  }

  // Kontrollera tilldelning (maybeSingle – 0 rader är ok, inte ett fel)
  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('task_id')
    .eq('task_id', id)
    .eq('profile_id', user.id)
    .maybeSingle()

  const isAssigned = !!assignment
  const isAdmin = profile.role === 'admin'

  if (!isAssigned && !isAdmin) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
