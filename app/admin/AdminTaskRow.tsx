'use client'

import { useEffect, useState } from 'react'
import type { Task, TaskStatus } from '@/lib/types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  ej_startad: 'Ej startad',
  pågår:      'Pågår',
  klar:       'Klar',
}

const STATUS_DOT: Record<TaskStatus, string> = {
  ej_startad: 'bg-zinc-500',
  pågår:      'bg-amber-400',
  klar:       'bg-green-500',
}

const STATUS_BORDER: Record<TaskStatus, string> = {
  ej_startad: 'border-l-zinc-700',
  pågår:      'border-l-amber-400',
  klar:       'border-l-green-500',
}

const STATUS_BADGE: Record<TaskStatus, string> = {
  ej_startad: 'bg-zinc-700/60 text-zinc-400',
  pågår:      'bg-amber-500/20 text-amber-300',
  klar:       'bg-green-500/20 text-green-400',
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

  // Synkronisera när Realtime-uppdatering ändrar task-prop
  useEffect(() => {
    setStatus(task.status)
  }, [task.status])

  async function updateStatus(newStatus: TaskStatus) {
    if (newStatus === status || loading) return
    setLoading(true)
    setStatus(newStatus) // optimistisk
    await fetch(`/api/admin/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setLoading(false)
  }

  return (
    <div className={`px-4 py-3 flex items-center gap-3 border-l-4 ${STATUS_BORDER[status]}`}>
      {/* Statusdot */}
      <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-600 font-mono">{task.start_time ?? '—'}</span>
          <span className="text-xs text-zinc-500">{EVENT_LABELS[task.event_date]}</span>
          <span className="text-xs text-zinc-500">{task.area}</span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_BADGE[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        <p className="text-sm text-zinc-200 mt-0.5">{task.title}</p>
      </div>

      {/* Admin-statusväljare */}
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
