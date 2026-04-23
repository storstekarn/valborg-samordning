import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sortTasks } from '@/lib/sortTasks'
import RedigeraClient from './RedigeraClient'
import type { Task, Profile } from '@/lib/types'

export default async function RedigeraPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const supabase = createAdminClient()

  const [tasksRes, profilesRes, assignmentsRes] = await Promise.all([
    supabase.from('tasks').select('*'),
    supabase.from('profiles').select('*').order('name'),
    supabase.from('task_assignments').select('task_id, profile_id'),
  ])

  const tasks = sortTasks((tasksRes.data as Task[]) ?? [])
  const profiles = (profilesRes.data as Profile[]) ?? []
  const assignments = (assignmentsRes.data ?? []) as { task_id: string; profile_id: string }[]

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
        />
      </main>
    </div>
  )
}
