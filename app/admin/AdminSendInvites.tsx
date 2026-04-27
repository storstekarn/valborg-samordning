'use client'

import { useState } from 'react'

interface PendingInvite {
  email: string
  name: string | null
}

interface SentInvite {
  email: string
  name: string | null
  sent_at: string
  hasLoggedIn: boolean
}

interface Props {
  pendingInvites: PendingInvite[]
  sentInvites: SentInvite[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function Avatar({ label }: { label: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 shrink-0 font-medium">
      {label.charAt(0).toUpperCase()}
    </div>
  )
}

export default function AdminSendInvites({ pendingInvites, sentInvites }: Props) {
  const [localPending, setLocalPending] = useState<PendingInvite[]>(pendingInvites)
  const [localSent, setLocalSent] = useState<SentInvite[]>(sentInvites)
  const [sendingAll, setSendingAll] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; errors: number } | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  // Per-person reminder state: email → 'sending' | 'sent' | 'error'
  const [reminderState, setReminderState] = useState<Record<string, 'sending' | 'sent' | 'error'>>({})

  async function sendAll() {
    setSendingAll(true)
    setSendError(null)
    setSendResult(null)
    const res = await fetch('/api/admin/send-invites', { method: 'POST' })
    setSendingAll(false)
    if (!res.ok) {
      setSendError('Något gick fel vid utskick.')
      return
    }
    const data: { sent: number; errors: number; sentEmails: string[]; sentAt: string | null } = await res.json()
    setSendResult({ sent: data.sent, errors: data.errors })
    if (data.sentEmails.length > 0 && data.sentAt) {
      const sentSet = new Set(data.sentEmails.map(e => e.toLowerCase()))
      const now = data.sentAt
      const justSent: SentInvite[] = localPending
        .filter(p => sentSet.has(p.email.toLowerCase()))
        .map(p => ({ email: p.email, name: p.name, sent_at: now, hasLoggedIn: false }))
      setLocalPending(prev => prev.filter(p => !sentSet.has(p.email.toLowerCase())))
      setLocalSent(prev => [...justSent, ...prev])
    }
  }

  async function sendReminder(invite: SentInvite) {
    setReminderState(prev => ({ ...prev, [invite.email]: 'sending' }))
    const res = await fetch('/api/admin/send-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: invite.email, name: invite.name }),
    })
    setReminderState(prev => ({ ...prev, [invite.email]: res.ok ? 'sent' : 'error' }))
  }

  return (
    <div className="space-y-5">

      {/* Send-all panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 bg-zinc-800/60 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-zinc-100">{localPending.length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Väntar på inbjudan</p>
          </div>
          <div className="flex-1 bg-zinc-800/60 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{localSent.filter(s => !s.hasLoggedIn).length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Inbjudna, ej inloggat</p>
          </div>
          <div className="flex-1 bg-zinc-800/60 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-green-400">{localSent.filter(s => s.hasLoggedIn).length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Inloggade</p>
          </div>
        </div>

        <p className="text-sm text-zinc-400">
          Skickar magic links via Resend till alla som inte fått inbjudan än.
          Varje person får en personlig inloggningslänk giltig i 24 timmar.
        </p>

        {sendResult && (
          <p className="text-sm text-green-400 bg-green-950/40 border border-green-900 rounded-lg px-3 py-2">
            Skickade {sendResult.sent} mejl.{sendResult.errors > 0 ? ` ${sendResult.errors} misslyckades.` : ''}
          </p>
        )}
        {sendError && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{sendError}</p>
        )}

        <button
          onClick={sendAll}
          disabled={sendingAll || localPending.length === 0}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          {sendingAll
            ? 'Skickar...'
            : localPending.length === 0
              ? 'Inga väntande inbjudningar'
              : `Skicka magic links (${localPending.length} st)`}
        </button>
      </div>

      {/* Väntar på inbjudan */}
      {localPending.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Väntar på inbjudan ({localPending.length})
            </p>
          </div>
          <ul className="divide-y divide-zinc-800">
            {localPending.map(inv => (
              <li key={inv.email} className="px-4 py-3 flex items-center gap-3">
                <Avatar label={inv.name ?? inv.email} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-200 truncate">{inv.name ?? '(inget namn)'}</p>
                  <p className="text-xs text-zinc-500 truncate">{inv.email}</p>
                </div>
                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-700 text-amber-400">
                  Ej skickad
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {localPending.length === 0 && localSent.length > 0 && (
        <p className="text-sm text-zinc-500 text-center py-2">
          Alla volontärer har fått sin inbjudan.
        </p>
      )}

      {/* Redan inbjudna */}
      {localSent.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Redan inbjudna ({localSent.length})
            </p>
          </div>
          <ul className="divide-y divide-zinc-800">
            {localSent.map(inv => {
              const rs = reminderState[inv.email]
              return (
                <li key={inv.email} className="px-4 py-3 flex items-center gap-3">
                  <Avatar label={inv.name ?? inv.email} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-200 truncate">{inv.name ?? '(inget namn)'}</p>
                    <p className="text-xs text-zinc-500 truncate">{inv.email}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Inbjuden {formatDate(inv.sent_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inv.hasLoggedIn ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-700 text-green-400">
                        Inloggad
                      </span>
                    ) : (
                      <>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500">
                          Ej inloggat
                        </span>
                        <button
                          onClick={() => sendReminder(inv)}
                          disabled={rs === 'sending' || rs === 'sent'}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-40 transition-colors"
                        >
                          {rs === 'sending' ? 'Skickar…'
                            : rs === 'sent' ? 'Skickad ✓'
                            : rs === 'error' ? 'Fel – försök igen'
                            : 'Skicka påminnelse'}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

    </div>
  )
}
