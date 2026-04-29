import { createAdminClient } from '@/lib/supabase/admin'
import { getVolunteerSession } from '@/lib/volunteerAuth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await getVolunteerSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { to_id, message } = await request.json()
  if (!to_id || !message?.trim()) {
    return NextResponse.json({ error: 'Ogiltig data' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('messages').insert({
    from_id: session.profileId,
    to_id,
    message: message.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
