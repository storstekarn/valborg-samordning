import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

function buildInviteHtml(name: string | null, loginUrl: string): string {
  const greeting = name ? `Hej ${name}!` : 'Hej!'
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inbjudan – Valborg Infra 2026</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:28px;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f59e0b;">
                Valborg Infra 2026
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:36px 36px 32px;">

              <!-- Greeting -->
              <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#f4f4f5;line-height:1.3;">
                ${greeting}
              </p>

              <!-- Body text -->
              <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.65;">
                Du är tilldelad uppgifter på valborgsmässoafton och kan följa körschema,
                rapportera incidenter och kommunicera med driftledningen via appen.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#a1a1aa;line-height:1.65;">
                Klicka på knappen nedan för att logga in – inga lösenord behövs.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:10px;background:#d97706;">
                    <a href="${loginUrl}"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#09090b;text-decoration:none;border-radius:10px;letter-spacing:0.01em;">
                      Logga in på Valborg Infra 2026
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-top:1px solid #27272a;"></td>
                </tr>
              </table>

              <!-- Footer note -->
              <p style="margin:0;font-size:12px;color:#52525b;line-height:1.6;">
                Länken är giltig i 24 timmar. Om den slutar fungera kan du be om en ny länk i appen.<br />
                Vid frågor, kontakta Patrik eller Max.
              </p>

            </td>
          </tr>

          <!-- Bottom padding -->
          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#3f3f46;text-align:center;">
                Valborg Infra 2026 &middot; Intern samordningsapp
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

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

      const { error: sendError } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@valborg.app',
        to: email,
        subject: 'Du är inbjuden till Valborg Infra 2026 – här är din inloggningslänk',
        html: buildInviteHtml(name ?? null, linkData.properties.action_link),
      })

      if (sendError) {
        errors++
        continue
      }

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
