'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'

interface Props {
  initialCount: number
  superadminId: string
}

export default function AdminUnreadCard({ initialCount, superadminId }: Props) {
  const [count, setCount] = useState(initialCount)
  const [isNew, setIsNew] = useState(false)
  const newTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!superadminId) return
    const supabase = createClient()

    // Prenumererar på samma broadcast-kanal som volontärernas meddelandesystem
    const channel = supabase
      .channel('valborg-messages')
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        const m = payload as Message
        if (m.to_id !== superadminId) return

        setCount(n => n + 1)
        setIsNew(true)

        if (newTimer.current) clearTimeout(newTimer.current)
        newTimer.current = setTimeout(() => setIsNew(false), 6000)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (newTimer.current) clearTimeout(newTimer.current)
    }
  }, [superadminId])

  const hasUnread = count > 0

  return (
    <Link
      href="/admin/meddelanden"
      onClick={() => { setCount(0); setIsNew(false) }}
      className={`rounded-xl p-4 text-center transition-colors block relative ${
        isNew
          ? 'bg-amber-950/40 border border-amber-500 hover:bg-amber-950/60'
          : hasUnread
            ? 'bg-red-950/30 border border-red-800 hover:bg-red-950/50'
            : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800'
      }`}
    >
      {isNew && (
        <span className="absolute -top-2 -right-2 bg-amber-500 text-zinc-900 text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none animate-pulse">
          NYTT
        </span>
      )}
      <p className={`text-2xl font-bold transition-colors ${
        isNew ? 'text-amber-400' : hasUnread ? 'text-red-400' : 'text-zinc-300'
      }`}>
        {count}
      </p>
      <p className="text-xs text-zinc-500 mt-1">Olästa meddelanden</p>
      <p className={`text-xs mt-0.5 ${isNew ? 'text-amber-400' : 'text-amber-400'}`}>→ Öppna</p>
    </Link>
  )
}
