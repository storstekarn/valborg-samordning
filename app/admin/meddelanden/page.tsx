export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminConversations from '../AdminConversations'
import type { Profile, Message } from '@/lib/types'

export default async function AdminMeddelandenPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>
}) {
  const { with: defaultSelectedId } = await searchParams
  const adminClient = createAdminClient()
  const superadminId = process.env.SUPERADMIN_PROFILE_ID ?? ''

  const [profilesRes, superadminMessagesRes, allMessagesRes] = await Promise.all([
    adminClient.from('profiles').select('id, name, email, role, phone').order('name'),
    superadminId
      ? adminClient.from('messages').select('*')
          .or(`from_id.eq.${superadminId},to_id.eq.${superadminId}`)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    adminClient
      .from('messages')
      .select('*, from_profile:profiles!from_id(name), to_profile:profiles!to_id(name)')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const profiles = (profilesRes.data as Profile[]) ?? []
  const superadminMessages = (superadminMessagesRes.data as Message[]) ?? []
  const allMessages = (allMessagesRes.data ?? []) as (Message & {
    from_profile: { name: string } | null
    to_profile: { name: string } | null
  })[]

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
              <h1 className="text-base font-bold text-amber-400">Meddelandecentral</h1>
              <p className="text-xs text-zinc-500">Valborg Infra 2026</p>
            </div>
          </div>
          <form action={handleLogout}>
            <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-300">Logga ut</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Superadmin konversationer */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Konversationer
          </h2>
          <AdminConversations
            superadminId={superadminId}
            profiles={profiles}
            initialMessages={superadminMessages}
            defaultSelectedId={defaultSelectedId}
          />
        </section>

        {/* Alla meddelanden i systemet */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Senaste meddelanden i systemet
          </h2>
          {allMessages.length === 0 ? (
            <p className="text-sm text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              Inga meddelanden.
            </p>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="divide-y divide-zinc-800">
                {allMessages.map((msg) => (
                  <div key={msg.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-500 mb-0.5">
                        <span className="text-zinc-300">{msg.from_profile?.name ?? '?'}</span>
                        {' → '}
                        <span className="text-zinc-300">{msg.to_profile?.name ?? '?'}</span>
                      </p>
                      <p className="text-sm text-zinc-200">{msg.message}</p>
                    </div>
                    <time className="shrink-0 text-xs text-zinc-600">
                      {new Date(msg.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
