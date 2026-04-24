import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY saknas' }, { status: 500 })
  }

  const supabase = createAdminClient()

  // Hämta alla i invite_queue som inte fått inbjudan än
  const { data: queued } = await supabase
    .from('invite_queue')
    .select('email, name')
    .is('sent_at', null)

  if (!queued || queued.length === 0) {
    return NextResponse.json({ sent: 0, errors: 0 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  let sent = 0
  let errors = 0
  const sentEmails: string[] = []

  for (const { email, name } of queued) {
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      })

      if (linkError || !linkData.properties?.action_link) {
        errors++
        continue
      }

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@valborg.app',
        to: email,
        subject: 'Inbjudan: Valborg Infra 2026',
        html: `
          <h2>Hej${name ? ` ${name}` : ''}!</h2>
          <p>Du är inbjuden att använda samordningsappen för Valborgsmässoafton 2026.</p>
          <p>Klicka på länken nedan för att logga in:</p>
          <p><a href="${linkData.properties.action_link}" style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Logga in på Valborg Infra 2026
          </a></p>
          <p style="color:#888;font-size:12px">Länken är giltig i 24 timmar.</p>
        `,
      })

      sentEmails.push(email)
      sent++
    } catch {
      errors++
    }
  }

  // Markera skickade som sent
  if (sentEmails.length > 0) {
    await supabase
      .from('invite_queue')
      .update({ sent_at: new Date().toISOString() })
      .in('email', sentEmails)
  }

  return NextResponse.json({ sent, errors })
}
