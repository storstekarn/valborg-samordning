import { createAdminClient } from '@/lib/supabase/admin'
import { getVolunteerSession } from '@/lib/volunteerAuth'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const session = await getVolunteerSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { name, phone } = await request.json()

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ name: name?.trim() ?? null, phone: phone?.trim() ?? null })
    .eq('id', session.profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
