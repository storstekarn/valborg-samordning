import { createAdminClient } from '@/lib/supabase/admin'
import { getVolunteerSession } from '@/lib/volunteerAuth'
import { NextResponse } from 'next/server'
import type { TaskStatus } from '@/lib/types'

const VALID_STATUSES: TaskStatus[] = ['ej_startad', 'pågår', 'klar']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getVolunteerSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { status } = await request.json() as { status: TaskStatus }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Ogiltig status' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', session.profileId)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'Profil hittades inte.' }, { status: 403 })

  const { data: assignment } = await adminClient
    .from('task_assignments')
    .select('task_id')
    .eq('task_id', id)
    .eq('profile_id', session.profileId)
    .maybeSingle()

  if (!assignment && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 403 })
  }

  const { error } = await adminClient
    .from('tasks')
    .update({ status, updated_by: session.profileId, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
