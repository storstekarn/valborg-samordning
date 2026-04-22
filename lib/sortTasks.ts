import type { Task } from '@/lib/types'

const DATE_ORDER: Record<string, number> = { fore: 0, valborg: 1, '1maj': 2 }

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const dateA = DATE_ORDER[a.event_date] ?? 99
    const dateB = DATE_ORDER[b.event_date] ?? 99
    if (dateA !== dateB) return dateA - dateB
    if (!a.start_time) return 1
    if (!b.start_time) return -1
    return a.start_time.localeCompare(b.start_time)
  })
}
