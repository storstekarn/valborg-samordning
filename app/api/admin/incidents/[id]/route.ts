import { createServiceClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { IncidentStatus } from '@/lib/types'

const VALID_STATUSES: IncidentStatus[] = ['ny', 'hanteras', 'löst']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json() as { status?: IncidentStatus; admin_comment?: string }

  const update: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Ogiltig status' }, { status: 400 })
    }
    update.status = body.status
  }

  if (body.admin_comment !== undefined) {
    update.admin_comment = body.admin_comment
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Inget att uppdatera' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('incidents')
    .update(update)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
