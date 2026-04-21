'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'

interface Props {
  profiles: Profile[]
}

export default function AdminMessageSender({ profiles }: Props) {
  const [toId, setToId] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!toId || !message.trim() || sending) return

    setSending(true)
    setFeedback(null)

    const res = await fetch('/api/admin/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_id: toId, message: message.trim() }),
    })

    setSending(false)

    if (res.ok) {
      setMessage('')
      setFeedback({ ok: true, text: 'Meddelandet skickat.' })
    } else {
      const data = await res.json()
      setFeedback({ ok: false, text: data.error ?? 'Något gick fel.' })
    }
  }

  const sorted = [...profiles].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))

  return (
    <form onSubmit={handleSend} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Mottagare</label>
        <select
          value={toId}
          onChange={(e) => { setToId(e.target.value); setFeedback(null) }}
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">— Välj mottagare —</option>
          {sorted.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name ?? p.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Meddelande</label>
        <textarea
          value={message}
          onChange={(e) => { setMessage(e.target.value); setFeedback(null) }}
          rows={3}
          placeholder="Skriv ditt meddelande..."
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sending || !toId || !message.trim()}
          className="text-xs font-medium bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {sending ? 'Skickar...' : 'Skicka meddelande'}
        </button>
        {feedback && (
          <span className={`text-xs ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}>
            {feedback.text}
          </span>
        )}
      </div>
    </form>
  )
}
