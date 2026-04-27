import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  // Profil måste finnas – annars är sessionen skapad men trigger har inte kört än
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json(
      { error: 'Din profil är inte klar än, försök logga ut och in igen' },
      { status: 403 }
    )
  }

  const { notes } = await request.json() as { notes: string }

  // RLS (tasks_update_assigned_or_admin) hanterar auktorisering
  const { error } = await supabase
    .from('tasks')
    .update({ notes: notes?.trim() || null })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
