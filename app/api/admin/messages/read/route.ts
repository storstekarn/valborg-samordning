import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })
  }

  const superadminId = process.env.SUPERADMIN_PROFILE_ID
  if (!superadminId) {
    return NextResponse.json({ error: 'SUPERADMIN_PROFILE_ID ej konfigurerat' }, { status: 500 })
  }

  const { partnerId } = await request.json() as { partnerId: string }
  if (!partnerId) {
    return NextResponse.json({ error: 'partnerId saknas' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('from_id', partnerId)
    .eq('to_id', superadminId)
    .eq('read', false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
