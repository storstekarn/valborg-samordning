'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'

interface Props {
  profiles: Profile[]
}

export default function AdminSendInvites({ profiles }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent: number; errors: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sendAll() {
    setLoading(true)
    setError(null)
    setResult(null)

    const res = await fetch('/api/admin/send-invites', { method: 'POST' })
    setLoading(false)

    if (res.ok) {
      const data = await res.json()
      setResult(data)
    } else {
      setError('Något gick fel vid utskick.')
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <p className="text-sm text-zinc-400">
        Skicka magic links via Resend till alla <strong className="text-zinc-200">{profiles.length} volontärer</strong> i databasen.
        Varje person får en personlig inloggningslänk per e-post.
      </p>

      {result && (
        <p className="text-sm text-green-400 bg-green-950/40 border border-green-900 rounded-lg px-3 py-2">
          Skickade {result.sent} mejl. {result.errors > 0 && `${result.errors} misslyckades.`}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={sendAll}
        disabled={loading}
        className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Skickar...' : `Skicka magic links (${profiles.length} st)`}
      </button>
    </div>
  )
}
