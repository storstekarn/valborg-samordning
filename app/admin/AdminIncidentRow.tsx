'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Incident, IncidentStatus } from '@/lib/types'

const STATUS_STYLES: Record<IncidentStatus, string> = {
  ny:       'bg-red-500/20 text-red-300',
  hanteras: 'bg-amber-500/20 text-amber-300',
  löst:     'bg-green-500/20 text-green-400',
}

const STATUS_LABELS: Record<IncidentStatus, string> = {
  ny:       'Ny',
  hanteras: 'Hanteras',
  löst:     'Löst',
}

const CATEGORY_LABELS: Record<string, string> = {
  brand: 'Brand', el: 'El', logistik: 'Logistik', övrigt: 'Övrigt',
}

const NEXT_STATUS: Partial<Record<IncidentStatus, IncidentStatus>> = {
  ny: 'hanteras', hanteras: 'löst',
}

interface Props {
  incident: Incident
  reporterName: string | null
  reporterPhone: string | null
}

export default function AdminIncidentRow({ incident, reporterName, reporterPhone }: Props) {
  const [status, setStatus] = useState<IncidentStatus>(incident.status)
  const [comment, setComment] = useState(incident.admin_comment ?? '')
  const [savedComment, setSavedComment] = useState(incident.admin_comment ?? '')
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [loadingComment, setLoadingComment] = useState(false)
  const router = useRouter()

  const next = NEXT_STATUS[status]

  async function advance() {
    if (!next || loadingStatus) return
    setLoadingStatus(true)
    await fetch('/api/admin/incidents/' + incident.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setStatus(next)
    setLoadingStatus(false)
    router.refresh()
  }

  async function saveComment() {
    if (loadingComment) return
    setLoadingComment(true)
    await fetch('/api/admin/incidents/' + incident.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_comment: comment }),
    })
    setSavedComment(comment)
    setLoadingComment(false)
  }

  const commentChanged = comment !== savedComment

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
              {STATUS_LABELS[status]}
            </span>
            <span className="text-xs text-zinc-500">{CATEGORY_LABELS[incident.category]}</span>
          </div>
          <p className="text-sm text-zinc-200">{incident.message}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {reporterName && (
              <span className="text-xs text-zinc-500">
                Rapporterad av <span className="text-zinc-400">{reporterName}</span>
              </span>
            )}
            {reporterPhone && (
              <a
                href={`tel:${reporterPhone}`}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                {reporterPhone}
              </a>
            )}
            <time className="text-xs text-zinc-600">
              {new Date(incident.created_at).toLocaleString('sv-SE')}
            </time>
          </div>
        </div>
        {next && (
          <button
            onClick={advance}
            disabled={loadingStatus}
            className="shrink-0 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingStatus ? '...' : `→ ${STATUS_LABELS[next]}`}
          </button>
        )}
      </div>

      {/* Intern kommentar */}
      <div className="flex gap-2">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Intern kommentar (visas ej för volontärer)..."
          rows={2}
          className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-xs placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
        />
        <button
          onClick={saveComment}
          disabled={loadingComment || !commentChanged}
          className="shrink-0 self-end text-xs font-medium px-3 py-2 rounded-lg transition-colors bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-40"
        >
          {loadingComment ? '...' : 'Spara'}
        </button>
      </div>
    </div>
  )
}
