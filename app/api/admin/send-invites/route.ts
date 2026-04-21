import { createServiceClient } from '@/lib/supabase/server'
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

  const supabase = await createServiceClient()

  // Hämta unika e-poster från pending_assignments (alltid seedat, oavsett om
  // användarna har loggat in eller inte)
  const { data: rows } = await supabase
    .from('pending_assignments')
    .select('email')

  const emails = [...new Set((rows ?? []).map((r: { email: string }) => r.email.toLowerCase()))]

  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, errors: 0 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  let sent = 0
  let errors = 0

  for (const email of emails) {
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
          <h2>Hej!</h2>
          <p>Du är inbjuden att använda samordningsappen för Valborgsmässoafton 2026.</p>
          <p>Klicka på länken nedan för att logga in:</p>
          <p><a href="${linkData.properties.action_link}" style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Logga in på Valborg Infra 2026
          </a></p>
          <p style="color:#888;font-size:12px">Länken är giltig i 24 timmar.</p>
        `,
      })

      sent++
    } catch {
      errors++
    }
  }

  return NextResponse.json({ sent, errors })
}
