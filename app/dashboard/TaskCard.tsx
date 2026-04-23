'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import StatusButton from './StatusButton'
import type { Task, Profile } from '@/lib/types'

interface Props {
  task: Task
  coAssignees: Profile[]
}

export default function TaskCard({ task, coAssignees }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [savedNotes, setSavedNotes] = useState(task.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isDirty = notes !== savedNotes

  async function saveNotes() {
    if (!isDirty || saving) return
    setSaving(true)
    const res = await fetch(`/api/tasks/${task.id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSaving(false)
    if (res.ok) {
      setSavedNotes(notes)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    }
  }

  function toggleExpand() {
    setExpanded(prev => !prev)
    if (!expanded) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-medium text-zinc-100">{task.title}</span>
              <span className="text-xs text-zinc-500">{task.area}</span>
            </div>
            {(task.start_time || task.end_time) && (
              <p className="text-xs text-zinc-500 font-mono mb-1">
                {task.start_time ?? ''}
                {task.end_time ? ` – ${task.end_time}` : ''}
              </p>
            )}
            {task.description && (
              <p className="text-xs text-zinc-500 leading-relaxed mb-2">{task.description}</p>
            )}
            <button
              onClick={toggleExpand}
              className="mt-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {expanded ? 'Stäng' : '📝 Anteckningar'}
            </button>
          </div>

          {/* Status + medansvariga – högerjusterat */}
          <div className="shrink-0 flex flex-col items-end gap-1.5" onClick={e => e.stopPropagation()}>
            <StatusButton taskId={task.id} currentStatus={task.status} />
            {coAssignees.length > 0 && (
              <span className="text-xs text-zinc-600">
                {coAssignees.length} medansvarig{coAssignees.length > 1 ? 'a' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-4 bg-zinc-900/60">
          {/* Co-assignees */}
          {coAssignees.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Medansvariga
              </p>
              <div className="flex flex-wrap gap-2">
                {coAssignees.map(p => (
                  <Link
                    key={p.id}
                    href={`/messages?with=${p.id}`}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-amber-400 hover:text-amber-300 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    {p.name ?? p.email} →
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Anteckningar
            </p>
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anteckningar – skriv överenskommelser, viktigt att tänka på..."
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-zinc-600">Delas med alla tilldelade</p>
              <button
                onClick={saveNotes}
                disabled={!isDirty || saving}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-500 text-white"
              >
                {saving ? 'Sparar...' : justSaved ? 'Sparat ✓' : 'Spara anteckningar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
