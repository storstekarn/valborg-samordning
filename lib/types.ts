export type EventDate = 'fore' | 'valborg' | '1maj'
export type TaskStatus = 'ej_startad' | 'pågår' | 'klar'
export type UserRole = 'admin' | 'volunteer'
export type IncidentCategory = 'brand' | 'el' | 'logistik' | 'övrigt'
export type IncidentStatus = 'ny' | 'hanteras' | 'löst'
export type MessageStatus = 'ny' | 'läst'

export interface Profile {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: UserRole
}

export interface Task {
  id: string
  title: string
  area: string
  description: string | null
  event_date: EventDate
  start_time: string | null
  end_time: string | null
  status: TaskStatus
  notes: string | null
  updated_by: string | null
  updated_at: string | null
}

export interface TaskWithAssignees extends Task {
  assignees?: Profile[]
}

export interface TaskAssignment {
  task_id: string
  profile_id: string
}

export interface Incident {
  id: string
  reported_by: string
  category: IncidentCategory
  message: string
  status: IncidentStatus
  admin_comment: string | null
  created_at: string
  profiles?: Profile
}

export interface Message {
  id: string
  from_id: string
  to_id: string
  message: string
  read: boolean
  created_at: string
  from_profile?: Profile
  to_profile?: Profile
}
