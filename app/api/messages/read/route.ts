import { createAdminClient } from '@/lib/supabase/admin'
import { getVolunteerSession } from '@/lib/volunteerAuth'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const session = await getVolunteerSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { from_id } = await request.json()
  if (!from_id) return NextResponse.json({ error: 'from_id krävs' }, { status: 400 })

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('messages')
    .update({ read: true })
    .eq('from_id', from_id)
    .eq('to_id', session.profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
