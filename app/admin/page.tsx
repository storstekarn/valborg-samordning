import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import AdminIncidentRow from './AdminIncidentRow'
import AdminTaskRow from './AdminTaskRow'
import AdminSendInvites from './AdminSendInvites'
import AdminMessageSender from './AdminMessageSender'
import type { Task, Incident, Message, TaskStatus, Profile } from '@/lib/types'

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
  const supabase = await createServiceClient()

  const [tasksRes, incidentsRes, messagesRes, pendingRes, profilesRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .order('event_date')
      .order('start_time', { nullsFirst: true }),
    supabase
      .from('incidents')
      .select('*, profiles(name, phone)')
      .order('created_at', { ascending: false }),
    supabase
      .from('messages')
      .select('*, from_profile:profiles!from_id(name), to_profile:profiles!to_id(name)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('pending_assignments')
      .select('email'),
    supabase
      .from('profiles')
      .select('id, name, email, role, phone')
      .order('name'),
  ])

  const tasks = (tasksRes.data as Task[]) ?? []
  const incidents = (incidentsRes.data ?? []) as (Incident & { profiles: { name: string; phone: string | null } | null })[]
  const messages = (messagesRes.data ?? []) as (Message & { from_profile: { name: string } | null, to_profile: { name: string } | null })[]
  const recipientCount = new Set((pendingRes.data ?? []).map((r: { email: string }) => r.email.toLowerCase())).size
  const profiles = (profilesRes.data as Profile[]) ?? []

  const totalTasks = tasks.length
  const klara = tasks.filter((t) => t.status === 'klar').length
  const pagar = tasks.filter((t) => t.status === 'pågår').length
  const nyaIncidenter = incidents.filter((i) => i.status === 'ny').length

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
          {[
            { label: 'Totalt uppgifter', value: totalTasks, color: 'text-zinc-300' },
            { label: 'Pågår', value: pagar, color: 'text-amber-400' },
            { label: 'Klara', value: klara, color: 'text-green-400' },
            { label: 'Nya incidenter', value: nyaIncidenter, color: 'text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Incidenter */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            Incidenter
            {nyaIncidenter > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                {nyaIncidenter} ny{nyaIncidenter > 1 ? 'a' : ''}
              </span>
            )}
          </h2>
          {incidents.length === 0 ? (
            <p className="text-sm text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              Inga incidenter rapporterade.
            </p>
          ) : (
            <div className="space-y-2">
              {incidents.map((incident) => (
                <AdminIncidentRow key={incident.id} incident={incident} reporterName={incident.profiles?.name ?? null} reporterPhone={incident.profiles?.phone ?? null} />
              ))}
            </div>
          )}
        </section>

        {/* Uppgiftsstatus */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Alla uppgifter
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {tasks.map((task) => (
                <AdminTaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        </section>

        {/* Meddelanden */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Senaste meddelanden
          </h2>
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              Inga meddelanden.
            </p>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="divide-y divide-zinc-800">
                {messages.slice(0, 20).map((msg) => (
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

        {/* Skicka meddelande */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Skicka meddelande
          </h2>
          <AdminMessageSender profiles={profiles} />
        </section>

        {/* Skicka magic links */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Skicka inbjudningar
          </h2>
          <AdminSendInvites recipientCount={recipientCount} />
        </section>
      </main>
    </div>
  )
}
