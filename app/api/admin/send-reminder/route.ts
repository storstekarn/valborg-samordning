import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/auth'
import { buildInviteHtml } from '@/lib/invite-email'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Ej behörig' }, { status: 401 })

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY saknas' }, { status: 500 })
  }

  const { email, name } = await request.json()
  if (!email?.trim()) return NextResponse.json({ error: 'email krävs' }, { status: 400 })

  const normalEmail = (email as string).trim().toLowerCase()
  const supabase = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: normalEmail,
    options: { redirectTo: `${siteUrl}/auth/callback` },
  })

  if (linkError || !linkData.properties?.action_link) {
    return NextResponse.json({ error: 'Kunde inte generera inloggningslänk' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendError } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@valborg.app',
    to: normalEmail,
    subject: 'Påminnelse: din inloggningslänk till Valborg Infra 2026',
    html: buildInviteHtml(name ?? null, linkData.properties.action_link),
  })

  if (sendError) {
    return NextResponse.json({ error: 'Kunde inte skicka mejl' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
