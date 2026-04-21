import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusButton from './StatusButton'
import type { Task } from '@/lib/types'

const EVENT_DATE_LABELS: Record<string, string> = {
  fore:    'Förberedelser',
  valborg: 'Valborg – 30 april',
  '1maj':  '1 maj',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Hämta tilldelade uppgifter
  const { data: assignments } = await supabase
    .from('task_assignments')
    .select('task_id')
    .eq('profile_id', user.id)

  const taskIds = (assignments ?? []).map((a) => a.task_id)

  let tasks: Task[] = []
  if (taskIds.length > 0) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .in('id', taskIds)
      .order('event_date')
      .order('start_time', { nullsFirst: true })
    tasks = (data as Task[]) ?? []
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
              Incident
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
            <div className="space-y-3">
              {Object.entries(
                tasks.reduce<Record<string, Task[]>>((acc, t) => {
                  const key = t.event_date
                  if (!acc[key]) acc[key] = []
                  acc[key].push(t)
                  return acc
                }, {})
              ).map(([date, dateTasks]) => (
                <div key={date}>
                  <p className="text-xs text-zinc-600 font-medium mb-2 uppercase tracking-wide">
                    {EVENT_DATE_LABELS[date] ?? date}
                  </p>
                  <div className="space-y-2">
                    {dateTasks.map((task) => (
                      <div key={task.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-medium text-zinc-100">{task.title}</span>
                              <span className="text-xs text-zinc-500">{task.area}</span>
                            </div>
                            {(task.start_time || task.end_time) && (
                              <p className="text-xs text-zinc-500 font-mono mb-1">
                                {task.start_time ?? ''}
                                {task.end_time ? ` – ${task.end_time}` : ''}
                              </p>
                            )}
                            {task.description && (
                              <p className="text-xs text-zinc-500 leading-relaxed">{task.description}</p>
                            )}
                          </div>
                          <div className="shrink-0">
                            <StatusButton taskId={task.id} currentStatus={task.status} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
