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
}

export default function AdminIncidentRow({ incident, reporterName }: Props) {
  const [status, setStatus] = useState<IncidentStatus>(incident.status)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const next = NEXT_STATUS[status]

  async function advance() {
    if (!next || loading) return
    setLoading(true)

    await fetch('/api/admin/incidents/' + incident.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })

    setStatus(next)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-zinc-500">{CATEGORY_LABELS[incident.category]}</span>
          {reporterName && (
            <span className="text-xs text-zinc-600">av {reporterName}</span>
          )}
        </div>
        <p className="text-sm text-zinc-200">{incident.message}</p>
        <time className="text-xs text-zinc-600 mt-1 block">
          {new Date(incident.created_at).toLocaleString('sv-SE')}
        </time>
      </div>
      {next && (
        <button
          onClick={advance}
          disabled={loading}
          className="shrink-0 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? '...' : `→ ${STATUS_LABELS[next]}`}
        </button>
      )}
    </div>
  )
}
