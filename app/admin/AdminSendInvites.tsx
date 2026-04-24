'use client'

import { useState } from 'react'

interface Props {
  pendingCount: number
  sentCount: number
  pendingInvites: { email: string; name: string | null }[]
}

export default function AdminSendInvites({ pendingCount, sentCount, pendingInvites }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent: number; errors: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localPending, setLocalPending] = useState(pendingCount)

  async function sendAll() {
    setLoading(true)
    setError(null)
    setResult(null)

    const res = await fetch('/api/admin/send-invites', { method: 'POST' })
    setLoading(false)

    if (res.ok) {
      const data = await res.json()
      setResult(data)
      setLocalPending(prev => Math.max(0, prev - data.sent))
    } else {
      setError('Något gick fel vid utskick.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats + send button */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 bg-zinc-800/60 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-zinc-100">{localPending}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Väntar på inbjudan</p>
          </div>
          <div className="flex-1 bg-zinc-800/60 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-green-400">{sentCount}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Skickade</p>
          </div>
        </div>

        <p className="text-sm text-zinc-400">
          Skickar magic links via Resend till alla i kön som inte fått inbjudan än.
          Varje person får en personlig inloggningslänk giltig i 24 timmar.
          Profil och uppgiftstilldelningar skapas automatiskt vid inloggning.
        </p>

        {result && (
          <p className="text-sm text-green-400 bg-green-950/40 border border-green-900 rounded-lg px-3 py-2">
            Skickade {result.sent} mejl.{result.errors > 0 ? ` ${result.errors} misslyckades.` : ''}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={sendAll}
          disabled={loading || localPending === 0}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          {loading ? 'Skickar...' : localPending === 0 ? 'Inga väntande inbjudningar' : `Skicka magic links (${localPending} st)`}
        </button>
      </div>

      {/* Lista väntande inbjudningar */}
      {pendingInvites.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Väntar på inbjudan ({pendingInvites.length})
            </p>
          </div>
          <ul className="divide-y divide-zinc-800">
            {pendingInvites.map(inv => (
              <li key={inv.email} className="px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 shrink-0 font-medium">
                  {(inv.name ?? inv.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{inv.name ?? '(inget namn)'}</p>
                  <p className="text-xs text-zinc-500 truncate">{inv.email}</p>
                </div>
                <span className="ml-auto shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-700 text-amber-400">
                  Ej skickad
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingInvites.length === 0 && sentCount > 0 && (
        <p className="text-sm text-zinc-500 text-center py-4">
          Alla inbjudningar har skickats.
        </p>
      )}
    </div>
  )
}
