import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessagesClient from './MessagesClient'
import type { Profile, Message } from '@/lib/types'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Hämta profiler och meddelanden parallellt
  const [profilesRes, messagesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, role, email, phone')
      .order('name'),
    supabase
      .from('messages')
      .select('*')
      .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
      .order('created_at', { ascending: true }),
  ])

  const profiles = (profilesRes.data as Profile[]) ?? []
  const messages = (messagesRes.data as Message[]) ?? []

  // Räkna ut "samma ansvarsområde" i tre steg
  // Steg 1: Hämta arean för användarens egna uppgifter
  const { data: userTaskData } = await supabase
    .from('task_assignments')
    .select('tasks(area)')
    .eq('profile_id', user.id)

  const userAreas = [
    ...new Set(
      (userTaskData ?? [])
        .map((a: { tasks: { area: string }[] | { area: string } | null }) =>
          Array.isArray(a.tasks) ? a.tasks[0]?.area : a.tasks?.area
        )
        .filter(Boolean) as string[]
    ),
  ]

  // Steg 2: Hämta alla task-id:n i dessa areas
  const { data: areaTaskData } = userAreas.length > 0
    ? await supabase.from('tasks').select('id').in('area', userAreas)
    : { data: [] }

  const areaTaskIds = (areaTaskData ?? []).map((t: { id: string }) => t.id)

  // Steg 3: Hämta profile_id:n tilldelade dessa uppgifter
  const { data: areaAssignData } = areaTaskIds.length > 0
    ? await supabase
        .from('task_assignments')
        .select('profile_id')
        .in('task_id', areaTaskIds)
    : { data: [] }

  const areaProfileIdSet = new Set(
    (areaAssignData ?? []).map((a: { profile_id: string }) => a.profile_id)
  )
  areaProfileIdSet.delete(user.id)

  const sameAreaProfiles = profiles.filter(p => areaProfileIdSet.has(p.id))

  return (
    <MessagesClient
      currentUserId={user.id}
      allProfiles={profiles}
      sameAreaProfiles={sameAreaProfiles}
      initialMessages={messages}
      superadminEmail={process.env.SUPERADMIN_EMAIL ?? ''}
    />
  )
}
