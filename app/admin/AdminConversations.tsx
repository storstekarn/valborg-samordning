'use client'

import { useEffect, useRef, useState } from 'react'
import type { Profile, Message } from '@/lib/types'

interface Props {
  superadminId: string
  profiles: Profile[]
  initialMessages: Message[]
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })
}

export default function AdminConversations({ superadminId, profiles, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Per-partner stats
  const lastByPartner: Record<string, Message> = {}
  const unreadByPartner: Record<string, number> = {}

  for (const m of messages) {
    const partnerId = m.from_id === superadminId ? m.to_id : m.from_id
    if (!lastByPartner[partnerId] || m.created_at > lastByPartner[partnerId].created_at) {
      lastByPartner[partnerId] = m
    }
    if (m.to_id === superadminId && !m.read) {
      unreadByPartner[partnerId] = (unreadByPartner[partnerId] ?? 0) + 1
    }
  }

  const hasMessages = new Set(Object.keys(lastByPartner))
  const others = profiles.filter(p => p.id !== superadminId)

  // Sort: conversations first (by recency), then rest alphabetically
  const sorted = [
    ...others.filter(p => hasMessages.has(p.id))
      .sort((a, b) =>
        (lastByPartner[b.id]?.created_at ?? '').localeCompare(lastByPartner[a.id]?.created_at ?? '')
      ),
    ...others.filter(p => !hasMessages.has(p.id))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
  ]

  const conversation = messages.filter(m =>
    (m.from_id === superadminId && m.to_id === selectedId) ||
    (m.from_id === selectedId && m.to_id === superadminId)
  )

  const selectedProfile = profiles.find(p => p.id === selectedId)
  const totalUnread = Object.values(unreadByPartner).reduce((s, n) => s + n, 0)

  function openConversation(id: string) {
    setSelectedId(id)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || !reply.trim() || sending) return
    setSending(true)
    const res = await fetch('/api/admin/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_id: selectedId, message: reply.trim() }),
    })
    if (res.ok) {
      const optimistic: Message = {
        id: crypto.randomUUID(),
        from_id: superadminId,
        to_id: selectedId,
        message: reply.trim(),
        read: false,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, optimistic])
      setReply('')
    }
    setSending(false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.length, selectedId])

  if (!superadminId) {
    return (
      <p className="text-xs text-red-400 bg-red-950/30 border border-red-900 rounded-xl p-4">
        SUPERADMIN_PROFILE_ID är inte satt. Konfigurera miljövariabeln i Railway.
      </p>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex h-[520px]">

      {/* Conversation list */}
      <div className="w-64 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Konversationer
          </span>
          {totalUnread > 0 && (
            <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
              {totalUnread}
            </span>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {sorted.map(p => {
            const last = lastByPartner[p.id]
            const unread = unreadByPartner[p.id] ?? 0
            const isSelected = p.id === selectedId

            return (
              <button
                key={p.id}
                onClick={() => openConversation(p.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-zinc-800/60 flex items-start gap-2.5 transition-colors
                  ${isSelected ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold">
                  {(p.name ?? p.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-medium truncate ${unread > 0 ? 'text-zinc-100' : 'text-zinc-300'}`}>
                      {p.name ?? p.email}
                    </span>
                    {last && (
                      <span className="shrink-0 text-[10px] text-zinc-600">{formatTime(last.created_at)}</span>
                    )}
                  </div>
                  {last ? (
                    <p className={`text-[11px] truncate mt-0.5 ${unread > 0 ? 'text-zinc-300 font-medium' : 'text-zinc-600'}`}>
                      {last.from_id === superadminId ? 'Du: ' : ''}{last.message}
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-700 mt-0.5">Starta konversation</p>
                  )}
                </div>
                {unread > 0 && (
                  <span className="shrink-0 mt-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
                    {unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active conversation */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedId ? (
          <>
            {/* Conversation header */}
            <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-full bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold">
                {(selectedProfile?.name ?? selectedProfile?.email ?? '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  {selectedProfile?.name ?? selectedProfile?.email}
                </p>
                {selectedProfile?.phone && (
                  <a href={`tel:${selectedProfile.phone}`} className="text-xs text-amber-400 hover:text-amber-300">
                    {selectedProfile.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
              {conversation.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center mt-6">
                  Inga meddelanden ännu. Skriv det första!
                </p>
              ) : (
                conversation.map(m => {
                  const isMine = m.from_id === superadminId
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        isMine
                          ? 'bg-amber-600 text-white rounded-br-sm'
                          : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                      }`}>
                        <p className="leading-relaxed text-sm">{m.message}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-amber-200' : 'text-zinc-500'}`}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            <form onSubmit={send} className="flex gap-2 px-3 py-2.5 border-t border-zinc-800 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder={`Svar till ${selectedProfile?.name ?? 'mottagaren'}...`}
                className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!reply.trim() || sending}
                className="shrink-0 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium px-3 py-2 rounded-lg text-sm transition-colors"
              >
                {sending ? '...' : 'Skicka'}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-zinc-600">Välj en konversation till vänster</p>
          </div>
        )}
      </div>
    </div>
  )
}
