'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  profileId: string
  name: string | null
  page: string
}

export default function PresenceTracker({ profileId, name, page }: Props) {
  useEffect(() => {
    if (!profileId) return
    const supabase = createClient()
    const channel = supabase.channel('online-users')

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ profile_id: profileId, name: name ?? 'Okänd', page })
      }
    })

    const handleUnload = () => { channel.untrack() }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      supabase.removeChannel(channel)
    }
  }, [profileId, name, page])

  return null
}
