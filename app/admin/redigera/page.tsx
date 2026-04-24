import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sortTasks } from '@/lib/sortTasks'
import RedigeraClient from './RedigeraClient'
import type { Task, Profile, VEntry, UserRole } from '@/lib/types'

export default async function RedigeraPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const supabase = createAdminClient()

  const [tasksRes, profilesRes, assignmentsRes, pendingRes] = await Promise.all([
    supabase.from('tasks').select('*'),
    supabase.from('profiles').select('*').order('name'),
    supabase.from('task_assignments').select('task_id, profile_id'),
    supabase
      .from('pending_assignments')
      .select('email, task_title, name, phone')
      .neq('task_title', ''),
  ])

  const tasks = sortTasks((tasksRes.data as Task[]) ?? [])
  const profiles = (profilesRes.data as Profile[]) ?? []
  const assignments = (assignmentsRes.data ?? []) as { task_id: string; profile_id: string }[]
  const pendingRows = (pendingRes.data ?? []) as {
    email: string; task_title: string; name: string | null; phone: string | null
  }[]

  const profileByEmail = new Map(profiles.map(p => [p.email.toLowerCase(), p]))
  const profileById   = new Map(profiles.map(p => [p.id, p]))
  const taskTitleToId = new Map(tasks.map(t => [t.title.toLowerCase(), t.id]))

  // ── assigneesPerTask: samma server-side-logik som dashboarden ──────────────
  // Fas 1: task_assignments (inloggade användare)
  const assigneesPerTask: Record<string, VEntry[]> = {}
  for (const a of assignments) {
    const p = profileById.get(a.profile_id)
    if (!p) continue
    if (!assigneesPerTask[a.task_id]) assigneesPerTask[a.task_id] = []
    const list = assigneesPerTask[a.task_id]
    if (!list.some(v => v.email.toLowerCase() === p.email.toLowerCase())) {
      list.push({ key: `p:${p.id}`, id: p.id, email: p.email, name: p.name, phone: p.phone, role: p.role, loggedIn: true })
    }
  }

  // Fas 2: pending_assignments – alla rader, dedup på e-post
  for (const row of pendingRows) {
    const email  = row.email.toLowerCase()
    const taskId = taskTitleToId.get(row.task_title.toLowerCase())
    if (!taskId) continue
    if (!assigneesPerTask[taskId]) assigneesPerTask[taskId] = []
    const list = assigneesPerTask[taskId]
    if (list.some(v => v.email.toLowerCase() === email)) continue // redan tillagd

    // Kontrollera om personen faktiskt loggat in (finns i profiles)
    const profile = profileByEmail.get(email)
    if (profile) {
      list.push({ key: `p:${profile.id}`, id: profile.id, email: profile.email, name: profile.name, phone: profile.phone, role: profile.role, loggedIn: true })
    } else {
      list.push({ key: `pending:${email}`, id: null, email, name: row.name ?? null, phone: row.phone ?? null, role: 'volunteer', loggedIn: false })
    }
  }

  // ── allVols: alla volontärer för dropdown och volontärfliken ──────────────
  const profileEmails = new Set(profiles.map(p => p.email.toLowerCase()))
  const pendingVolMap = new Map<string, VEntry>()
  for (const row of pendingRows) {
    const email = row.email.toLowerCase()
    if (!profileEmails.has(email) && !pendingVolMap.has(email)) {
      pendingVolMap.set(email, { key: `pending:${email}`, id: null, email, name: row.name ?? null, phone: row.phone ?? null, role: 'volunteer', loggedIn: false })
    }
  }
  const allVols: VEntry[] = [
    ...profiles.map(p => ({ key: `p:${p.id}`, id: p.id, email: p.email, name: p.name, phone: p.phone, role: p.role, loggedIn: true } as VEntry)),
    ...Array.from(pendingVolMap.values()),
  ]

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
          initialAllVols={allVols}
          initialAssigneesPerTask={assigneesPerTask}
        />
      </main>
    </div>
  )
}
