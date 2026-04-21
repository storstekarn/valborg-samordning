'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TaskStatus } from '@/lib/types'

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  ej_startad: 'pågår',
  pågår: 'klar',
}

const BUTTON_LABELS: Partial<Record<TaskStatus, string>> = {
  ej_startad: 'Starta',
  pågår: 'Markera klar',
}

const BUTTON_STYLES: Partial<Record<TaskStatus, string>> = {
  ej_startad: 'bg-amber-600 hover:bg-amber-500 text-white',
  pågår: 'bg-green-600 hover:bg-green-500 text-white',
}

interface Props {
  taskId: string
  currentStatus: TaskStatus
}

export default function StatusButton({ taskId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const next = NEXT_STATUS[currentStatus]
  if (!next) return null

  async function handleClick() {
    setLoading(true)
    await fetch(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${BUTTON_STYLES[currentStatus]}`}
    >
      {loading ? '...' : BUTTON_LABELS[currentStatus]}
    </button>
  )
}
