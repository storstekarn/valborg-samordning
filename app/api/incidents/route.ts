import { createAdminClient } from '@/lib/supabase/admin'
import { getVolunteerSession } from '@/lib/volunteerAuth'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const VALID_CATEGORIES = ['brand', 'el', 'logistik', 'övrigt']

const CATEGORY_LABELS: Record<string, string> = {
  brand: 'Brand',
  el: 'El',
  logistik: 'Logistik',
  övrigt: 'Övrigt',
}

export async function POST(request: Request) {
  const session = await getVolunteerSession()
  if (!session) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })

  const { category, message } = await request.json()
  if (!VALID_CATEGORIES.includes(category) || !message?.trim()) {
    return NextResponse.json({ error: 'Ogiltig data' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('name, email')
    .eq('id', session.profileId)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'Profil hittades inte.' }, { status: 403 })
  }

  const { error: insertError } = await adminClient
    .from('incidents')
    .insert({ reported_by: session.profileId, category, message: message.trim(), status: 'ny' })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const reporterName = profile.name || session.email
      const recipients = [
        process.env.SUPERADMIN_EMAIL,
        'max.angervall@gmail.com',
      ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) as string[]

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@synergyminds.se',
        to: recipients,
        subject: `[Valborg Infra] Incident: ${CATEGORY_LABELS[category]}`,
        html: `
          <h2>Ny incident rapporterad</h2>
          <p><strong>Kategori:</strong> ${CATEGORY_LABELS[category]}</p>
          <p><strong>Rapporterad av:</strong> ${reporterName}</p>
          <p><strong>Meddelande:</strong></p>
          <blockquote>${message.trim()}</blockquote>
          <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin">Öppna admin-panelen</a></p>
        `,
      })
    } catch {
      // E-postfel blockerar inte svaret
    }
  }

  return NextResponse.json({ ok: true })
}
