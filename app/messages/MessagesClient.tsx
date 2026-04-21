'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Message } from '@/lib/types'

interface Props {
  currentUserId: string
  allProfiles: Profile[]
  initialMessages: Message[]
  superadminEmail: string
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

export default function MessagesClient({ currentUserId, allProfiles, initialMessages, superadminEmail }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Bygg mottagarlista: superadmin och Max överst, resten av profilerna
  const MAX_EMAIL = 'max.angervall@gmail.com'
  const superadmin = allProfiles.find((p) => p.email.toLowerCase() === superadminEmail.toLowerCase())
  const maxProfile = allProfiles.find((p) => p.email.toLowerCase() === MAX_EMAIL)

  const priorityIds = new Set([superadmin?.id, maxProfile?.id].filter(Boolean) as string[])
  const priorityProfiles = allProfiles.filter((p) => priorityIds.has(p.id) && p.id !== currentUserId)
  const otherProfiles = allProfiles
    .filter((p) => !priorityIds.has(p.id) && p.id !== currentUserId)
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))

  const recipientOptions = [...priorityProfiles, ...otherProfiles]

  // Konversation med vald person
  const conversation = messages.filter(
    (m) =>
      (m.from_id === currentUserId && m.to_id === selectedUserId) ||
      (m.from_id === selectedUserId && m.to_id === currentUserId)
  )

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('messages:mine')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as Message
          if (m.from_id === currentUserId || m.to_id === currentUserId) {
            setMessages((prev) => [...prev, m])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  // Scrolla till botten vid ny konversation eller nytt meddelande
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.length, selectedUserId])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId || !newMessage.trim() || sending) return

    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({
      from_id: currentUserId,
      to_id: selectedUserId,
      message: newMessage.trim(),
    })
    setSending(false)
    setNewMessage('')
  }

  const selectedProfile = allProfiles.find((p) => p.id === selectedUserId)

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-base font-bold text-zinc-100">Meddelanden</h1>
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-4 py-4 flex-1 flex flex-col gap-4">
        {/* Mottagarval */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Skicka till
          </label>
          <select
            value={selectedUserId ?? ''}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">— Välj mottagare —</option>

            {priorityProfiles.length > 0 && (
              <optgroup label="Driftansvarig">
                {priorityProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? 'Okänd'} ({p.role === 'admin' ? 'Admin' : 'Volontär'})
                  </option>
                ))}
              </optgroup>
            )}

            {otherProfiles.length > 0 && (
              <optgroup label="Övriga">
                {otherProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? 'Okänd'}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Konversation */}
        {selectedUserId && (
          <>
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3 min-h-48 max-h-96 overflow-y-auto">
              {conversation.length === 0 ? (
                <p className="text-sm text-zinc-600 text-center mt-4">
                  Inga meddelanden än. Skriv det första!
                </p>
              ) : (
                conversation.map((m) => {
                  const isMine = m.from_id === currentUserId
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                          isMine
                            ? 'bg-amber-600 text-white rounded-br-none'
                            : 'bg-zinc-800 text-zinc-100 rounded-bl-none'
                        }`}
                      >
                        <p>{m.message}</p>
                        <p className={`text-xs mt-1 ${isMine ? 'text-amber-200' : 'text-zinc-500'}`}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Skriv meddelande */}
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Meddelande till ${selectedProfile?.name ?? 'mottagaren'}...`}
                className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
              >
                Skicka
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
