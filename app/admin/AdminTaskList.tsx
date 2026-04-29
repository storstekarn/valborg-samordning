'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sortTasks } from '@/lib/sortTasks'
import AdminTaskRow from './AdminTaskRow'
import type { Task } from '@/lib/types'

interface Props {
  initialTasks: Task[]
}

export default function AdminTaskList({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  useEffect(() => {
    const supabase = createClient()
    // tasks_select_all policy: using (true) – gäller alla roller inkl anon
    // postgres_changes events levereras utan Supabase-session
    const channel = supabase
      .channel('admin:tasks:realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks' },
        (payload) => {
          const updated = payload.new as Task
          setTasks(prev => sortTasks(prev.map(t => t.id === updated.id ? { ...t, ...updated } : t)))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="divide-y divide-zinc-800">
        {tasks.map((task) => (
          <AdminTaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}
