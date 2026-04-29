import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { EventDate } from '@/lib/types'

const VALID_DATES: EventDate[] = ['fore', 'valborg', '1maj']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const update: Record<string, unknown> = {}

  const VALID_STATUSES = ['ej_startad', 'pågår', 'klar']
  if (body.title !== undefined) update.title = String(body.title).trim()
  if (body.area !== undefined) update.area = String(body.area).trim()
  if (body.description !== undefined) update.description = body.description?.trim() || null
  if (body.event_date !== undefined) {
    if (!VALID_DATES.includes(body.event_date)) {
      return NextResponse.json({ error: 'Ogiltigt datum' }, { status: 400 })
    }
    update.event_date = body.event_date
  }
  if (body.start_time !== undefined) update.start_time = body.start_time?.trim() || null
  if (body.end_time !== undefined) update.end_time = body.end_time?.trim() || null
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Ogiltig status' }, { status: 400 })
    }
    update.status = body.status
  }
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Inget att uppdatera' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('tasks').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()

  // Hämta task_title för att kunna rensa pending_assignments
  const { data: task } = await supabase
    .from('tasks')
    .select('title')
    .eq('id', id)
    .single()
  if (!task) return NextResponse.json({ error: 'Uppgift hittades inte' }, { status: 404 })

  // Ta bort tilldelningar (task_assignments och pending_assignments)
  await supabase.from('task_assignments').delete().eq('task_id', id)
  await supabase.from('pending_assignments').delete().eq('task_title', task.title)

  // Ta bort uppgiften
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
