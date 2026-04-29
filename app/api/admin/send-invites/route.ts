import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { buildInviteHtml } from '@/lib/invite-email'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY saknas' }, { status: 500 })
  }

  const supabase = createAdminClient()

  // Källa: alla unika e-poster i pending_assignments
  const { data: pendingRows } = await supabase
    .from('pending_assignments')
    .select('email, name')

  // Vilka har redan fått en inbjudan?
  const { data: sentRows } = await supabase
    .from('invite_queue')
    .select('email')
    .not('sent_at', 'is', null)

  const sentEmailSet = new Set((sentRows ?? []).map(r => (r.email as string).toLowerCase()))

  // Bygg distinct-map av de som ska bjudas in
  const toInvite = new Map<string, string | null>()
  for (const row of pendingRows ?? []) {
    const email = (row.email as string).toLowerCase()
    if (!sentEmailSet.has(email) && !toInvite.has(email)) {
      toInvite.set(email, (row.name as string | null) ?? null)
    }
  }

  if (toInvite.size === 0) {
    return NextResponse.json({ sent: 0, errors: 0, sentEmails: [], sentAt: null })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const loginUrl = `${siteUrl}/auth/login`

  let sent = 0
  let errors = 0
  const sentEmailsList: string[] = []

  for (const [email, name] of toInvite) {
    try {
      const { error: sendError } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@synergyminds.se',
        to: email,
        subject: 'Du är inbjuden till Valborg Infra 2026',
        html: buildInviteHtml(name, loginUrl),
      })

      if (sendError) { errors++; continue }

      sentEmailsList.push(email)
      sent++
    } catch {
      errors++
    }
  }

  // Registrera skickade i invite_queue (upsert – skapar eller uppdaterar raden)
  const now = new Date().toISOString()
  if (sentEmailsList.length > 0) {
    await supabase
      .from('invite_queue')
      .upsert(
        sentEmailsList.map(email => ({
          email,
          name: toInvite.get(email) ?? null,
          sent_at: now,
        })),
        { onConflict: 'email' }
      )
  }

  return NextResponse.json({ sent, errors, sentEmails: sentEmailsList, sentAt: now })
}
