'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TaskStatus } from '@/lib/types'

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  ej_startad: 'pågår',
  pågår: 'klar',
  klar: 'ej_startad',
}

const NEXT_LABELS: Record<TaskStatus, string> = {
  ej_startad: 'Markera som pågår',
  pågår: 'Markera som klar',
  klar: 'Återställ till ej startad',
}

const CURRENT_STYLES: Record<TaskStatus, string> = {
  ej_startad: 'bg-zinc-700/60 text-zinc-400',
  pågår: 'bg-amber-500/20 text-amber-300',
  klar: 'bg-green-500/20 text-green-400',
}

const CURRENT_LABELS: Record<TaskStatus, string> = {
  ej_startad: 'Ej startad',
  pågår: 'Pågår',
  klar: 'Klar',
}

const BUTTON_STYLES: Record<TaskStatus, string> = {
  ej_startad: 'bg-amber-600 hover:bg-amber-500 text-white',
  pågår: 'bg-green-700 hover:bg-green-600 text-white',
  klar: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300',
}

interface Props {
  taskId: string
  currentStatus: TaskStatus
}

export default function StatusButton({ taskId, currentStatus }: Props) {
  const [status, setStatus] = useState<TaskStatus>(currentStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    const next = NEXT_STATUS[status]
    setLoading(true)
    const res = await fetch(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setLoading(false)
    if (res.ok) {
      setStatus(next)
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${CURRENT_STYLES[status]}`}>
        {CURRENT_LABELS[status]}
      </span>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${BUTTON_STYLES[status]}`}
      >
        {loading ? '...' : NEXT_LABELS[status]}
      </button>
    </div>
  )
}
