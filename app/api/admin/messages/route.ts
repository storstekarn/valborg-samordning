import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })
  }

  const fromId = process.env.SUPERADMIN_PROFILE_ID
  if (!fromId) {
    return NextResponse.json({ error: 'SUPERADMIN_PROFILE_ID ej konfigurerat' }, { status: 500 })
  }

  const { to_id, message } = await request.json() as { to_id: string; message: string }

  if (!to_id || !message?.trim()) {
    return NextResponse.json({ error: 'Ogiltig data' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('messages').insert({
    from_id: fromId,
    to_id,
    message: message.trim(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
