import { createAdminClient } from '@/lib/supabase/admin'
import { getVolunteerSession } from '@/lib/volunteerAuth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await getVolunteerSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const since = new URL(request.url).searchParams.get('since') ?? new Date(0).toISOString()

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('messages')
    .select('*')
    .eq('to_id', session.profileId)
    .gt('created_at', since)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(request: Request) {
  const session = await getVolunteerSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { to_id, message } = await request.json()
  if (!to_id || !message?.trim()) {
    return NextResponse.json({ error: 'Ogiltig data' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data: inserted, error } = await adminClient
    .from('messages')
    .insert({ from_id: session.profileId, to_id, message: message.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, message: inserted })
}
