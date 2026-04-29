import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVolunteerSession } from '@/lib/volunteerAuth'
import MessagesClient from './MessagesClient'
import type { Profile, Message } from '@/lib/types'

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>
}) {
  const { with: defaultPartnerId } = await searchParams
  const session = await getVolunteerSession()
  if (!session) redirect('/auth/login')

  const adminClient = createAdminClient()

  const [profilesRes, messagesRes] = await Promise.all([
    adminClient
      .from('profiles')
      .select('id, name, role, email, phone')
      .order('name'),
    adminClient
      .from('messages')
      .select('*')
      .or(`from_id.eq.${session.profileId},to_id.eq.${session.profileId}`)
      .order('created_at', { ascending: true }),
  ])

  const profiles = (profilesRes.data as Profile[]) ?? []
  const messages = (messagesRes.data as Message[]) ?? []

  // Hämta kollegors ansvarsområden
  const { data: userTaskData } = await adminClient
    .from('task_assignments')
    .select('tasks(area)')
    .eq('profile_id', session.profileId)

  const userAreas = [
    ...new Set(
      (userTaskData ?? [])
        .map((a: { tasks: { area: string }[] | { area: string } | null }) =>
          Array.isArray(a.tasks) ? a.tasks[0]?.area : a.tasks?.area
        )
        .filter(Boolean) as string[]
    ),
  ]

  const { data: areaTaskData } = userAreas.length > 0
    ? await adminClient.from('tasks').select('id').in('area', userAreas)
    : { data: [] }

  const areaTaskIds = (areaTaskData ?? []).map((t: { id: string }) => t.id)

  const { data: areaAssignData } = areaTaskIds.length > 0
    ? await adminClient
        .from('task_assignments')
        .select('profile_id')
        .in('task_id', areaTaskIds)
    : { data: [] }

  const areaProfileIdSet = new Set(
    (areaAssignData ?? []).map((a: { profile_id: string }) => a.profile_id)
  )
  areaProfileIdSet.delete(session.profileId)

  const sameAreaProfiles = profiles.filter(p => areaProfileIdSet.has(p.id))

  return (
    <MessagesClient
      currentUserId={session.profileId}
      allProfiles={profiles}
      sameAreaProfiles={sameAreaProfiles}
      initialMessages={messages}
      superadminEmail={process.env.SUPERADMIN_EMAIL ?? ''}
      defaultPartnerId={defaultPartnerId}
    />
  )
}
