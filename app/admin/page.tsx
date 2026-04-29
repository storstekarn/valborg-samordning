export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminIncidentRow from './AdminIncidentRow'
import AdminTaskList from './AdminTaskList'
import AdminUnreadCard from './AdminUnreadCard'
import VolunteerStatusCard from './VolunteerStatusCard'
import { sortTasks } from '@/lib/sortTasks'
import type { Task, Incident, TaskStatus } from '@/lib/types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  ej_startad: 'Ej startad',
  pågår:      'Pågår',
  klar:       'Klar',
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  ej_startad: 'bg-zinc-700/60 text-zinc-400',
  pågår:      'bg-amber-500/20 text-amber-300',
  klar:       'bg-green-500/20 text-green-400',
}

export default async function AdminPage() {
  const adminClient = createAdminClient()
  const superadminId = process.env.SUPERADMIN_PROFILE_ID ?? ''

  const [
    tasksRes,
    activeIncidentsRes,
    archivedCountRes,
    unreadCountRes,
    profilesRes,
    pendingVolsRes,
  ] = await Promise.all([
    adminClient.from('tasks').select('*').order('title'),
    adminClient
      .from('incidents')
      .select('*, profiles(name, phone)')
      .in('status', ['ny', 'hanteras'])
      .order('created_at', { ascending: false }),
    adminClient
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'löst'),
    superadminId
      ? adminClient
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('to_id', superadminId)
          .eq('read', false)
      : Promise.resolve({ count: 0 }),
    adminClient.from('profiles').select('id, name, email'),
    adminClient.from('pending_assignments').select('email, name'),
  ])

  const tasks = sortTasks((tasksRes.data as Task[]) ?? [])
  console.log('[admin] tasks.status snapshot:', tasks.map(t => ({ id: t.id, title: t.title, status: t.status })))
  const activeIncidents = (activeIncidentsRes.data ?? []) as (Incident & {
    profiles: { name: string; phone: string | null } | null
  })[]
  const archivedCount = archivedCountRes.count ?? 0
  const unreadMessages = unreadCountRes.count ?? 0

  const superadminName = (profilesRes.data ?? []).find(p => p.id === superadminId)?.name ?? 'Admin'

  // Alla profiler exklusive superadmin = inloggade (profil skapas vid första lyckade inloggning)
  const allProfilesExSuperadmin = (profilesRes.data ?? []).filter(p => p.id !== superadminId)
  const allProfileEmails = new Set(allProfilesExSuperadmin.map(p => (p.email as string).toLowerCase()))

  const loggedInVols = allProfilesExSuperadmin.map(p => ({
    id: p.id as string,
    name: p.name as string | null,
    email: p.email as string,
  }))

  // Ej inloggade: finns i pending_assignments men saknar profil
  const notLoggedInMap = new Map<string, string | null>()
  for (const row of pendingVolsRes.data ?? []) {
    const email = (row.email as string).toLowerCase()
    if (!allProfileEmails.has(email) && !notLoggedInMap.has(email)) {
      notLoggedInMap.set(email, (row.name as string | null) ?? null)
    }
  }
  const notLoggedInVols = [...notLoggedInMap.entries()].map(([email, name]) => ({
    id: null as null,
    email,
    name,
  }))

  const totalTasks = tasks.length
  const klara = tasks.filter((t) => t.status === 'klar').length
  const pagar = tasks.filter((t) => t.status === 'pågår').length
  const nyaIncidenter = activeIncidents.filter((i) => i.status === 'ny').length

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
          <div>
            <h1 className="text-base font-bold text-amber-400">Valborg Infra 2026</h1>
            <p className="text-xs text-zinc-500">Admin · Driftledningsvy</p>
          </div>
          <form action={handleLogout}>
            <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-300">
              Logga ut
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* Statistik */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{klara}/{totalTasks}</p>
            <p className="text-xs text-zinc-500 mt-1">Uppgifter klara</p>
            {pagar > 0 && <p className="text-xs text-amber-400 mt-0.5">{pagar} pågår</p>}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${nyaIncidenter > 0 ? 'text-red-400' : 'text-zinc-300'}`}>
              {activeIncidents.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Aktiva incidenter</p>
            {nyaIncidenter > 0 && (
              <p className="text-xs text-red-400 mt-0.5">{nyaIncidenter} nya</p>
            )}
          </div>

          <AdminUnreadCard
            initialCount={unreadMessages}
            superadminId={superadminId}
          />

          <VolunteerStatusCard
            loggedIn={loggedInVols}
            notLoggedIn={notLoggedInVols}
            trackAs={superadminId ? { profileId: superadminId, name: superadminName } : undefined}
          />
        </div>

        {/* Aktiva incidenter */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            Incidenter
            {nyaIncidenter > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                {nyaIncidenter} ny{nyaIncidenter > 1 ? 'a' : ''}
              </span>
            )}
          </h2>
          {activeIncidents.length === 0 ? (
            <p className="text-sm text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              Inga aktiva incidenter.
            </p>
          ) : (
            <div className="space-y-2">
              {activeIncidents.map((incident) => (
                <AdminIncidentRow
                  key={incident.id}
                  incident={incident}
                  reporterName={incident.profiles?.name ?? null}
                  reporterPhone={incident.profiles?.phone ?? null}
                />
              ))}
            </div>
          )}
          <div className="mt-2">
            <Link href="/admin/incidenter/arkiv" className="text-xs text-zinc-500 hover:text-zinc-300">
              Visa arkiv ({archivedCount} lösta) →
            </Link>
          </div>
        </section>

        {/* Uppgiftsstatus */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Alla uppgifter
          </h2>
          <AdminTaskList initialTasks={tasks} />
        </section>

        {/* Snabblänkar */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/admin/redigera"
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex items-center justify-between transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-zinc-200">Redigera schema</p>
              <p className="text-xs text-zinc-500 mt-0.5">Uppgifter, tilldelningar och volontärer</p>
            </div>
            <span className="text-zinc-600 text-sm">→</span>
          </Link>
          <Link
            href="/admin/meddelanden"
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex items-center justify-between transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-zinc-200">Meddelandecentral</p>
              <p className="text-xs text-zinc-500 mt-0.5">Konversationer och systemmeddelanden</p>
            </div>
            <span className="text-zinc-600 text-sm">→</span>
          </Link>
          <Link
            href="/admin/inbjudningar"
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex items-center justify-between transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-zinc-200">Skicka inbjudningar</p>
              <p className="text-xs text-zinc-500 mt-0.5">Inbjudningsmejl med inloggningsinstruktioner</p>
            </div>
            <span className="text-zinc-600 text-sm">→</span>
          </Link>
        </section>

      </main>
    </div>
  )
}
