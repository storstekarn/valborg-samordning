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
  const [notes, setNotes] = useState(task.notes ?? '')
  const [expanded, setExpanded] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  useEffect(() => { setStatus(task.status) }, [task.status])
  useEffect(() => { setNotes(task.notes ?? '') }, [task.notes])

  async function updateStatus(newStatus: TaskStatus) {
    if (newStatus === status || loadingStatus) return
    setLoadingStatus(true)
    setStatus(newStatus)
    await fetch(`/api/admin/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setLoadingStatus(false)
  }

  async function saveNotes() {
    setSavingNotes(true)
    setNotesSaved(false)
    await fetch(`/api/admin/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSavingNotes(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  return (
    <div className={`border-l-4 ${STATUS_BORDER[status]}`}>
      {/* Huvudrad – klickbar för att expandera */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-800/40 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-600 font-mono">{task.start_time ?? '—'}</span>
            <span className="text-xs text-zinc-500">{EVENT_LABELS[task.event_date]}</span>
            <span className="text-xs text-zinc-500">{task.area}</span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_BADGE[status]}`}>
              {STATUS_LABELS[status]}
            </span>
            {task.notes && (
              <span className="text-xs text-zinc-600">📝</span>
            )}
          </div>
          <p className="text-sm text-zinc-200 mt-0.5">{task.title}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <select
            value={status}
            onChange={(e) => updateStatus(e.target.value as TaskStatus)}
            disabled={loadingStatus}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <span className="text-zinc-600 text-xs select-none">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanderad anteckningspanel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60 bg-zinc-900/60">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Anteckningar
            <span className="ml-1 text-zinc-600 font-normal">(delas med volontärerna)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setNotesSaved(false) }}
            rows={3}
            placeholder="Inga anteckningar ännu..."
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="text-xs font-medium bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {savingNotes ? 'Sparar...' : 'Spara'}
            </button>
            {notesSaved && <span className="text-xs text-green-400">Sparat!</span>}
          </div>
        </div>
      )}
    </div>
  )
}
