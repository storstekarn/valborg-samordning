import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminSendInvites from '../AdminSendInvites'

export default async function AdminInbjudningarPage() {
  const supabase = createAdminClient()

  const [pendingRes, queueRes, profilesRes] = await Promise.all([
    supabase.from('pending_assignments').select('email, name'),
    supabase.from('invite_queue').select('email, name, sent_at').order('sent_at', { ascending: false }),
    supabase.from('profiles').select('email'),
  ])

  // Distinct email → name från pending_assignments (source of truth för vilka som finns)
  const distinctPending = new Map<string, string | null>()
  for (const row of pendingRes.data ?? []) {
    const email = (row.email as string).toLowerCase()
    if (!distinctPending.has(email)) distinctPending.set(email, row.name ?? null)
  }

  // Inbjudna: invite_queue med sent_at
  const sentMap = new Map<string, { name: string | null; sent_at: string }>()
  for (const row of queueRes.data ?? []) {
    if (row.sent_at) sentMap.set((row.email as string).toLowerCase(), { name: row.name, sent_at: row.sent_at })
  }

  // Inloggade
  const loggedInEmails = new Set((profilesRes.data ?? []).map(p => (p.email as string).toLowerCase()))

  // "Väntar på inbjudan": finns i pending_assignments men EJ i sentMap
  const pendingInvites = [...distinctPending.entries()]
    .filter(([email]) => !sentMap.has(email))
    .map(([email, name]) => ({ email, name }))

  // "Redan inbjudna": finns i sentMap
  const sentInvites = [...sentMap.entries()].map(([email, { name, sent_at }]) => ({
    email,
    name,
    sent_at,
    hasLoggedIn: loggedInEmails.has(email),
  }))

  async function handleLogout() {
    'use server'
    const { cookies } = await import('next/headers')
    const { redirect } = await import('next/navigation')
    const cookieStore = await cookies()
    cookieStore.delete('admin_token')
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors">
              ← Admin
            </Link>
            <div>
              <h1 className="text-base font-bold text-amber-400">Skicka inbjudningar</h1>
              <p className="text-xs text-zinc-500">{pendingInvites.length} väntande · {sentInvites.length} skickade</p>
            </div>
          </div>
          <form action={handleLogout}>
            <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-300">Logga ut</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <AdminSendInvites
          pendingInvites={pendingInvites}
          sentInvites={sentInvites}
        />
      </main>
    </div>
  )
}
