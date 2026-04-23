import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { EventDate } from '@/lib/types'

const VALID_DATES: EventDate[] = ['fore', 'valborg', '1maj']

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  const body = await request.json()
  const { title, area, description, event_date, start_time, end_time } = body

  if (!title?.trim() || !area?.trim() || !VALID_DATES.includes(event_date)) {
    return NextResponse.json({ error: 'Titel, område och datum krävs' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: title.trim(),
      area: area.trim(),
      description: description?.trim() || null,
      event_date,
      start_time: start_time?.trim() || null,
      end_time: end_time?.trim() || null,
      status: 'ej_startad',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
