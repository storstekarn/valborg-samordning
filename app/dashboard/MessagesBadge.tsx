'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playMessageSound, showNotification } from '@/lib/notifications'
import type { Message } from '@/lib/types'

interface Props {
  profileId: string
  initialUnread: number
}

export default function MessagesBadge({ profileId, initialUnread }: Props) {
  const [unread, setUnread] = useState(initialUnread)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('valborg-messages')
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        const m = payload as Message
        if (m.to_id !== profileId) return
        setUnread(n => n + 1)
        playMessageSound()
        showNotification('💬 Nytt meddelande', m.message.slice(0, 100))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profileId])

  return (
    <Link
      href="/messages"
      onClick={() => setUnread(0)}
      className="relative text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg transition-colors"
    >
      Meddelanden
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
