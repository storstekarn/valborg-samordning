'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Task, TaskStatus } from '@/lib/types'

const STATUS_STYLES: Record<TaskStatus, string> = {
  ej_startad: 'bg-zinc-700/60 text-zinc-400',
  pågår:      'bg-amber-500/20 text-amber-300',
  klar:       'bg-green-500/20 text-green-400',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  ej_startad: 'Ej startad',
  pågår:      'Pågår',
  klar:       'Klar',
}

const ALL_STATUSES: TaskStatus[] = ['ej_startad', 'pågår', 'klar']

const EVENT_LABELS: Record<string, string> = {
  fore: 'Förb.', valborg: 'Valborg', '1maj': '1 maj',
}

interface Props {
  task: Task
}

export default function AdminTaskRow({ task }: Props) {
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function updateStatus(newStatus: TaskStatus) {
    if (newStatus === status || loading) return
    setLoading(true)

    await fetch(`/api/tasks/${task.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    setStatus(newStatus)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-600 font-mono">
            {task.start_time ?? '—'}
          </span>
          <span className="text-xs text-zinc-500">{EVENT_LABELS[task.event_date]}</span>
          <span className="text-xs text-zinc-500">{task.area}</span>
        </div>
        <p className="text-sm text-zinc-200 mt-0.5">{task.title}</p>
      </div>
      <select
        value={status}
        onChange={(e) => updateStatus(e.target.value as TaskStatus)}
        disabled={loading}
        className="shrink-0 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>
    </div>
  )
}
