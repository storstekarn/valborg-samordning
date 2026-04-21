import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TaskBoard from '@/components/TaskBoard'
import type { Task } from '@/lib/types'

export const revalidate = 0

export default async function HomePage() {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('event_date')
    .order('start_time', { nullsFirst: true })

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-amber-400 leading-none">
              Valborg Infra 2026
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">Live körschema</p>
          </div>
          <Link
            href="/auth/login"
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Logga in
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <TaskBoard initialTasks={(tasks as Task[]) ?? []} />
      </main>

      <footer className="border-t border-zinc-900 mt-12 py-6 text-center">
        <p className="text-xs text-zinc-700">Valborg Infra 2026 · Uppdateras i realtid</p>
      </footer>
    </div>
  )
}
