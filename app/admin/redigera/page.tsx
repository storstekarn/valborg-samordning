import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sortTasks } from '@/lib/sortTasks'
import RedigeraClient from './RedigeraClient'
import type { Task, Profile, PendingVolEntry, UserRole } from '@/lib/types'

export default async function RedigeraPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const supabase = createAdminClient()

  const [tasksRes, profilesRes, assignmentsRes, pendingRes] = await Promise.all([
    supabase.from('tasks').select('*'),
    supabase.from('profiles').select('*').order('name'),
    supabase.from('task_assignments').select('task_id, profile_id'),
    supabase.from('pending_assignments').select('email, task_title, name, phone, role'),
  ])

  const tasks = sortTasks((tasksRes.data as Task[]) ?? [])
  const profiles = (profilesRes.data as Profile[]) ?? []
  const assignments = (assignmentsRes.data ?? []) as { task_id: string; profile_id: string }[]
  const pendingRows = (pendingRes.data ?? []) as { email: string; task_title: string; name: string | null; phone: string | null; role: string }[]

  // Unika e-poster som redan är inloggade (har en profil)
  const profileEmails = new Set(profiles.map(p => p.email.toLowerCase()))

  // Bygg upp karta: task title (lowercase) → task id
  const taskTitleMap = new Map(tasks.map(t => [t.title.toLowerCase(), t.id]))

  // Pending-volontärer: unika per e-post, inte i profiles
  const pendingVolMap = new Map<string, PendingVolEntry>()
  for (const row of pendingRows) {
    const email = row.email.toLowerCase()
    if (!profileEmails.has(email) && !pendingVolMap.has(email)) {
      pendingVolMap.set(email, {
        email,
        name: row.name ?? null,
        phone: row.phone ?? null,
        role: (row.role as UserRole) ?? 'volunteer',
      })
    }
  }
  const pendingVols = Array.from(pendingVolMap.values())

  // Pending-tilldelningar: task_id-baserade, ALLA rader oavsett om personen loggat in.
  // Deduplicering på e-post sker client-side i assigneesFor (task_assignments vinner).
  const pendingTaskAssignments: { task_id: string; email: string; name: string | null }[] = []
  const seen = new Set<string>()
  for (const row of pendingRows) {
    if (!row.task_title) continue
    const email = row.email.toLowerCase()
    const taskId = taskTitleMap.get(row.task_title.toLowerCase())
    if (taskId) {
      const key = `${taskId}:${email}`
      if (!seen.has(key)) {
        seen.add(key)
        pendingTaskAssignments.push({ task_id: taskId, email, name: row.name ?? null })
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-amber-400">Valborg Infra 2026</h1>
            <p className="text-xs text-zinc-500">Admin · Redigera schema</p>
          </div>
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Tillbaka
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <RedigeraClient
          initialTasks={tasks}
          initialProfiles={profiles}
          initialAssignments={assignments}
          initialPendingVols={pendingVols}
          initialPendingTaskAssignments={pendingTaskAssignments}
        />
      </main>
    </div>
  )
}
