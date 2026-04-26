'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playMessageSound, showNotification } from '@/lib/notifications'
import SoundToggle from '@/components/SoundToggle'
import type { Profile, Message } from '@/lib/types'

interface Props {
  currentUserId: string
  allProfiles: Profile[]
  sameAreaProfiles: Profile[]
  initialMessages: Message[]
  superadminEmail: string
  defaultPartnerId?: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })
}

function displayName(p: Profile): string {
  return p.name ?? 'Okänd'
}

export default function MessagesClient({ currentUserId, allProfiles, sameAreaProfiles, initialMessages, superadminEmail, defaultPartnerId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(defaultPartnerId ?? null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'conversation'>(
    defaultPartnerId ? 'conversation' : 'list'
  )
  const [showNewMsg, setShowNewMsg] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const newMsgRef = useRef<HTMLSelectElement>(null)

  // Priority profiles: superadmin + Max
  const MAX_EMAIL = 'max.angervall@gmail.com'
  const priorityIds = new Set(
    allProfiles
      .filter(p => p.email.toLowerCase() === superadminEmail.toLowerCase() || p.email.toLowerCase() === MAX_EMAIL)
      .map(p => p.id)
  )

  // Per-partner stats
  const lastByPartner: Record<string, Message> = {}
  const unreadByPartner: Record<string, number> = {}

  for (const m of messages) {
    const partnerId = m.from_id === currentUserId ? m.to_id : m.from_id
    if (!lastByPartner[partnerId] || m.created_at > lastByPartner[partnerId].created_at) {
      lastByPartner[partnerId] = m
    }
    if (m.to_id === currentUserId && !m.read) {
      unreadByPartner[partnerId] = (unreadByPartner[partnerId] ?? 0) + 1
    }
  }

  const partnersWithMessages = new Set(Object.keys(lastByPartner))

  // Sorted conversation list: priority → conversations by recency → rest alphabetically
  const profilesSorted = [
    ...allProfiles.filter(p => p.id !== currentUserId && priorityIds.has(p.id)),
    ...allProfiles
      .filter(p => p.id !== currentUserId && !priorityIds.has(p.id) && partnersWithMessages.has(p.id))
      .sort((a, b) => (lastByPartner[b.id]?.created_at ?? '').localeCompare(lastByPartner[a.id]?.created_at ?? '')),
    ...allProfiles
      .filter(p => p.id !== currentUserId && !priorityIds.has(p.id) && !partnersWithMessages.has(p.id))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
  ]

  // Dropdown groups for "Nytt meddelande"
  const priorityProfiles = allProfiles.filter(p => p.id !== currentUserId && priorityIds.has(p.id))
  const areaOnlyProfiles = sameAreaProfiles.filter(p => !priorityIds.has(p.id))

  const conversation = messages.filter(m =>
    (m.from_id === currentUserId && m.to_id === selectedUserId) ||
    (m.from_id === selectedUserId && m.to_id === currentUserId)
  )

  const selectedProfile = allProfiles.find(p => p.id === selectedUserId)

  async function markRead(partnerId: string) {
    const supabase = createClient()
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('from_id', partnerId)
      .eq('to_id', currentUserId)
    setMessages(prev =>
      prev.map(m =>
        m.from_id === partnerId && m.to_id === currentUserId ? { ...m, read: true } : m
      )
    )
  }

  function openConversation(userId: string) {
    setSelectedUserId(userId)
    setMobileView('conversation')
    setShowNewMsg(false)
    markRead(userId)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  function toggleNewMsg() {
    setShowNewMsg(prev => !prev)
    if (!showNewMsg) setTimeout(() => newMsgRef.current?.focus(), 80)
  }

  function backToList() {
    setMobileView('list')
    setSelectedUserId(null)
  }

  // Mark pre-selected conversation as read on mount
  useEffect(() => {
    if (!defaultPartnerId) return
    const supabase = createClient()
    supabase.from('messages').update({ read: true })
      .eq('from_id', defaultPartnerId)
      .eq('to_id', currentUserId)
    setMessages(prev =>
      prev.map(m =>
        m.from_id === defaultPartnerId && m.to_id === currentUserId ? { ...m, read: true } : m
      )
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('messages:mine')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message
        if (m.from_id !== currentUserId && m.to_id !== currentUserId) return
        setMessages(prev => {
          if (prev.some(x => x.id === m.id)) return prev
          return [...prev, m]
        })
        if (m.to_id === currentUserId && m.from_id === selectedUserId) {
          const supabase = createClient()
          supabase.from('messages').update({ read: true })
            .eq('id', m.id)
            .eq('to_id', currentUserId)
          setMessages(prev => prev.map(x => x.id === m.id ? { ...x, read: true } : x))
        }
        if (m.to_id === currentUserId) {
          playMessageSound()
          const senderName = allProfiles.find(p => p.id === m.from_id)?.name ?? 'Okänd'
          showNotification(
            `💬 Nytt meddelande från ${senderName}`,
            m.message.slice(0, 100)
          )
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, selectedUserId])

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

  const totalUnread = Object.values(unreadByPartner).reduce((s, n) => s + n, 0)

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur shrink-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mobileView === 'conversation' && (
              <button
                onClick={backToList}
                className="md:hidden text-xs font-medium px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
              >
                ← Tillbaka
              </button>
            )}
            <h1 className="text-base font-bold text-zinc-100">
              {mobileView === 'conversation' && selectedProfile
                ? displayName(selectedProfile)
                : 'Meddelanden'}
              {totalUnread > 0 && mobileView === 'list' && (
                <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                  {totalUnread}
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <SoundToggle />
            <Link
              href="/dashboard"
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
            >
              ← Tillbaka till dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden max-w-4xl w-full mx-auto">

        {/* Conversation list */}
        <div className={`
          flex-col w-full md:w-72 lg:w-80 shrink-0 border-r border-zinc-800
          ${mobileView === 'conversation' ? 'hidden md:flex' : 'flex'}
        `}>
          {/* List header with "Nytt meddelande" button */}
          <div className="shrink-0 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Konversationer
            </span>
            <button
              onClick={toggleNewMsg}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors
                ${showNewMsg
                  ? 'bg-zinc-700 text-zinc-300'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'}`}
            >
              {showNewMsg ? '✕ Stäng' : '+ Nytt'}
            </button>
          </div>

          {/* New message dropdown */}
          {showNewMsg && (
            <div className="shrink-0 px-3 py-3 border-b border-zinc-700 bg-zinc-800/40">
              <p className="text-[10px] text-zinc-500 mb-1.5 font-medium uppercase tracking-wide">
                Välj mottagare
              </p>
              <select
                ref={newMsgRef}
                defaultValue=""
                onChange={e => { if (e.target.value) openConversation(e.target.value) }}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="" disabled>— välj person —</option>

                {priorityProfiles.length > 0 && (
                  <optgroup label="Driftansvarig">
                    {priorityProfiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {displayName(p)}
                      </option>
                    ))}
                  </optgroup>
                )}

                {areaOnlyProfiles.length > 0 && (
                  <optgroup label="Mitt ansvarsområde">
                    {[...areaOnlyProfiles]
                      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {displayName(p)}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {profilesSorted.map(profile => {
              const last = lastByPartner[profile.id]
              const unread = unreadByPartner[profile.id] ?? 0
              const isSelected = profile.id === selectedUserId
              const isPriority = priorityIds.has(profile.id)

              return (
                <button
                  key={profile.id}
                  onClick={() => openConversation(profile.id)}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-800/60 transition-colors flex items-start gap-3
                    ${isSelected ? 'bg-zinc-800' : 'hover:bg-zinc-900'}`}
                >
                  <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                    ${isPriority ? 'bg-amber-500/30 text-amber-300' : 'bg-zinc-700 text-zinc-300'}`}>
                    {displayName(profile).charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm font-medium truncate ${unread > 0 ? 'text-zinc-100' : 'text-zinc-300'}`}>
                        {displayName(profile)}
                        {isPriority && (
                          <span className="ml-1.5 text-xs text-amber-400 font-normal">Admin</span>
                        )}
                      </span>
                      {last && (
                        <span className="shrink-0 text-xs text-zinc-600">{formatTime(last.created_at)}</span>
                      )}
                    </div>
                    {last ? (
                      <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-zinc-300 font-medium' : 'text-zinc-600'}`}>
                        {last.from_id === currentUserId ? 'Du: ' : ''}{last.message}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-700 mt-0.5">Starta konversation</p>
                    )}
                  </div>

                  {unread > 0 && (
                    <span className="shrink-0 mt-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold px-1">
                      {unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Active conversation */}
        <div className={`
          flex-1 flex-col overflow-hidden
          ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
        `}>
          {selectedUserId ? (
            <>
              {/* Desktop conversation header */}
              <div className="hidden md:flex items-center gap-3 px-4 py-3 border-b border-zinc-800 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${priorityIds.has(selectedUserId) ? 'bg-amber-500/30 text-amber-300' : 'bg-zinc-700 text-zinc-300'}`}>
                  {selectedProfile ? displayName(selectedProfile).charAt(0).toUpperCase() : '?'}
                </div>
                <span className="font-medium text-zinc-100 text-sm">
                  {selectedProfile ? displayName(selectedProfile) : ''}
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {conversation.length === 0 ? (
                  <p className="text-sm text-zinc-600 text-center mt-8">
                    Inga meddelanden än. Skriv det första!
                  </p>
                ) : (
                  conversation.map(m => {
                    const isMine = m.from_id === currentUserId
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                          isMine
                            ? 'bg-amber-600 text-white rounded-br-sm'
                            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                        }`}>
                          <p className="leading-relaxed">{m.message}</p>
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

              {/* Input */}
              <form onSubmit={sendMessage} className="flex gap-2 px-4 py-3 border-t border-zinc-800 shrink-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={`Meddelande till ${selectedProfile ? displayName(selectedProfile) : 'mottagaren'}...`}
                  className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-xl px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="shrink-0 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Skicka
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-zinc-600">Välj en konversation till vänster</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
