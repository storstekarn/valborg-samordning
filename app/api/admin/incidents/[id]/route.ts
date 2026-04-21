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
  const { status } = await request.json() as { status: IncidentStatus }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Ogiltig status' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('incidents')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
