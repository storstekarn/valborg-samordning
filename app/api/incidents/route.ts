import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  const { category, message } = await request.json()

  if (!VALID_CATEGORIES.includes(category) || !message?.trim()) {
    return NextResponse.json({ error: 'Ogiltig data' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .single()

  // Spara incident
  const adminClient = createAdminClient()
  const { error: insertError } = await adminClient
    .from('incidents')
    .insert({ reported_by: user.id, category, message: message.trim(), status: 'ny' })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Skicka e-post via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const reporterName = profile?.name || user.email
      const subject = `[Valborg Infra] Incident: ${CATEGORY_LABELS[category]}`
      const html = `
        <h2>Ny incident rapporterad</h2>
        <p><strong>Kategori:</strong> ${CATEGORY_LABELS[category]}</p>
        <p><strong>Rapporterad av:</strong> ${reporterName}</p>
        <p><strong>Meddelande:</strong></p>
        <blockquote>${message.trim()}</blockquote>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin">Öppna admin-panelen</a></p>
      `

      const recipients = [
        process.env.SUPERADMIN_EMAIL,
        'max.angervall@gmail.com',
      ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) as string[]

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@synergyminds.se',
        to: recipients,
        subject,
        html,
      })
    } catch {
      // E-postfel blockerar inte svaret
    }
  }

  return NextResponse.json({ ok: true })
}
