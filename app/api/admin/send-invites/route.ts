import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { buildInviteHtml } from '@/lib/invite-email'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY saknas' }, { status: 500 })
  }

  const supabase = createAdminClient()

  const { data: pendingRows } = await supabase
    .from('pending_assignments')
    .select('email, name')

  const { data: sentRows } = await supabase
    .from('invite_queue')
    .select('email')
    .not('sent_at', 'is', null)

  const sentEmailSet = new Set((sentRows ?? []).map(r => (r.email as string).toLowerCase()))

  const toInvite = new Map<string, string | null>()
  for (const row of pendingRows ?? []) {
    const email = (row.email as string).toLowerCase()
    if (!sentEmailSet.has(email) && !toInvite.has(email)) {
      toInvite.set(email, (row.name as string | null) ?? null)
    }
  }

  if (toInvite.size === 0) {
    return NextResponse.json({ sent: 0, errors: 0, sentEmails: [], failedEmails: [], sentAt: null })
  }

  console.log(`[send-invites] Startar utskick till ${toInvite.size} mottagare`)

  const resend = new Resend(process.env.RESEND_API_KEY)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const loginUrl = `${siteUrl}/auth/login`

  const sentEmailsList: string[] = []
  const failedEmailsList: string[] = []

  const entries = [...toInvite.entries()]
  for (let i = 0; i < entries.length; i++) {
    const [email, name] = entries[i]
    try {
      const { error: sendError } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@synergyminds.se',
        to: email,
        subject: 'Du är inbjuden till Valborg Infra 2026',
        html: buildInviteHtml(name, loginUrl),
      })

      if (sendError) {
        console.error(`[send-invites] Misslyckades (${i + 1}/${entries.length}): ${email} – ${sendError.message}`)
        failedEmailsList.push(email)
      } else {
        console.log(`[send-invites] Skickat (${i + 1}/${entries.length}): ${email}`)
        sentEmailsList.push(email)
      }
    } catch (err) {
      console.error(`[send-invites] Undantag (${i + 1}/${entries.length}): ${email}`, err)
      failedEmailsList.push(email)
    }

    // 500ms fördröjning mellan varje mejl – undviker Resend rate-limit
    if (i < entries.length - 1) await delay(500)
  }

  console.log(`[send-invites] Klart – ${sentEmailsList.length} lyckade, ${failedEmailsList.length} misslyckade`)

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

  return NextResponse.json({
    sent: sentEmailsList.length,
    errors: failedEmailsList.length,
    sentEmails: sentEmailsList,
    failedEmails: failedEmailsList,
    sentAt: now,
  })
}
