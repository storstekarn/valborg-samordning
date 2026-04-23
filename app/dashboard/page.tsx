import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProfileEditor from './ProfileEditor'
import IncidentBanner from './IncidentBanner'
import InstallBanner from './InstallBanner'
import TaskCard from './TaskCard'
import { sortTasks } from '@/lib/sortTasks'
import type { Task, Incident, Profile } from '@/lib/types'

const EVENT_DATE_LABELS: Record<string, string> = {
  fore:    'Förberedelser',
  valborg: 'Valborg – 30 april',
  '1maj':  '1 maj',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Hämta profil, uppgiftstilldelningar och aktiva incidenter parallellt
  const [profileRes, assignmentsRes, incidentsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('task_assignments').select('task_id').eq('profile_id', user.id),
    supabase
      .from('incidents')
      .select('id, category, message, status, admin_comment, created_at, reported_by')
      .in('status', ['ny', 'hanteras'])
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data
  const taskIds = (assignmentsRes.data ?? []).map((a: { task_id: string }) => a.task_id)
  const activeIncidents = (incidentsRes.data as Incident[]) ?? []

  let tasks: Task[] = []
  let coAssignMap: Record<string, Profile[]> = {}

  if (taskIds.length > 0) {
    // Hämta uppgifter och medansvariga parallellt
    const [tasksRes, coAssignRes] = await Promise.all([
      supabase.from('tasks').select('*').in('id', taskIds),
      supabase
        .from('task_assignments')
        .select('task_id, profiles(id, name, email, phone, role)')
        .in('task_id', taskIds)
        .neq('profile_id', user.id),
    ])

    tasks = sortTasks((tasksRes.data as Task[]) ?? [])

    // Bygg { taskId → Profile[] }
    for (const row of (coAssignRes.data ?? []) as {
      task_id: string
      profiles: Profile | Profile[] | null
    }[]) {
      const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      if (!p) continue
      if (!coAssignMap[row.task_id]) coAssignMap[row.task_id] = []
      coAssignMap[row.task_id].push(p)
    }
  }

  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  const displayName = profile?.name || user.email

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-amber-400">Valborg Infra 2026</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{displayName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/incidents/new" className="text-xs bg-red-900/60 hover:bg-red-900 text-red-300 px-2.5 py-1.5 rounded-lg transition-colors">
              Rapportera incident
            </Link>
            <Link href="/messages" className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg transition-colors">
              Meddelanden
            </Link>
            <form action={handleLogout}>
              <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 rounded-lg transition-colors">
                Logga ut
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <IncidentBanner initialIncidents={activeIncidents} />
        <InstallBanner />

        {/* Profil-kort */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Inloggad som</p>
          <p className="font-semibold text-zinc-100">{displayName}</p>
          {profile?.role === 'admin' && (
            <span className="mt-2 inline-block text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
              Admin
            </span>
          )}
          {profile?.role === 'admin' && (
            <p className="mt-3">
              <Link href="/admin" className="text-xs text-amber-400 hover:text-amber-300 underline">
                Öppna admin-panelen →
              </Link>
            </p>
          )}
        </div>

        {/* Min profil */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Min profil
          </h2>
          <ProfileEditor
            profileId={user.id}
            initialName={profile?.name ?? null}
            initialPhone={profile?.phone ?? null}
          />
        </section>

        {/* Mina uppgifter */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Mina uppgifter
          </h2>

          {tasks.length === 0 ? (
            <p className="text-sm text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              Inga uppgifter tilldelade ännu.
            </p>
          ) : (
            <div className="space-y-4">
              {(['fore', 'valborg', '1maj'] as const).map(date => {
                const dateTasks = tasks.filter(t => t.event_date === date)
                if (dateTasks.length === 0) return null
                return (
                  <div key={date}>
                    <p className="text-xs text-zinc-600 font-medium mb-2 uppercase tracking-wide">
                      {EVENT_DATE_LABELS[date]}
                    </p>
                    <div className="space-y-2">
                      {dateTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          coAssignees={coAssignMap[task.id] ?? []}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
