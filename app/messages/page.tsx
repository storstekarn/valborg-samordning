import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessagesClient from './MessagesClient'
import type { Profile, Message } from '@/lib/types'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Hämta alla profiler (för dropdown)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, role, email')
    .order('name')

  // Hämta mina meddelanden
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
    .order('created_at', { ascending: true })

  return (
    <MessagesClient
      currentUserId={user.id}
      allProfiles={(profiles as Profile[]) ?? []}
      initialMessages={(messages as Message[]) ?? []}
      superadminEmail={process.env.SUPERADMIN_EMAIL ?? ''}
    />
  )
}
