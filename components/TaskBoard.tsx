'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sortTasks } from '@/lib/sortTasks'
import type { Task, EventDate, TaskStatus } from '@/lib/types'

const EVENT_DATE_LABELS: Record<EventDate, string> = {
  fore: 'Förberedelser',
  valborg: 'Valborg – 30 april',
  '1maj': '1 maj',
}

const AREA_COLORS: Record<string, string> = {
  Tält:         'bg-sky-500/20 text-sky-300 border-sky-700',
  El:           'bg-yellow-500/20 text-yellow-300 border-yellow-700',
  'Eld/Vatten': 'bg-orange-500/20 text-orange-300 border-orange-700',
  Ris:          'bg-green-500/20 text-green-300 border-green-700',
  Logistik:     'bg-purple-500/20 text-purple-300 border-purple-700',
  Drift:        'bg-indigo-500/20 text-indigo-300 border-indigo-700',
  Fackeltåg:    'bg-amber-500/20 text-amber-300 border-amber-700',
  Brand:        'bg-red-500/20 text-red-300 border-red-700',
}

const AREA_BORDER: Record<string, string> = {
  Tält:         'border-l-sky-500',
  El:           'border-l-yellow-500',
  'Eld/Vatten': 'border-l-orange-500',
  Ris:          'border-l-green-500',
  Logistik:     'border-l-purple-500',
  Drift:        'border-l-indigo-500',
  Fackeltåg:    'border-l-amber-500',
  Brand:        'border-l-red-500',
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  ej_startad: 'bg-zinc-700/60 text-zinc-400',
  pågår:      'bg-amber-500/20 text-amber-300',
  klar:       'bg-green-500/20 text-green-400',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  ej_startad: 'Ej startad',
  pågår:      'Pågår',
  klar:       'Klar',
}

interface Props {
  initialTasks: Task[]
}

export default function TaskBoard({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(sortTasks(initialTasks))

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks((prev) =>
            sortTasks(prev.map((t) =>
              t.id === payload.new.id ? { ...t, ...(payload.new as Task) } : t
            ))
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const completedCount = tasks.filter((t) => t.status === 'klar').length
  const totalCount = tasks.length
  const pctDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Group into date sections for section headers, but keep tasks in flat sorted order
  const sections = (['fore', 'valborg', '1maj'] as EventDate[])
    .map((date) => ({ date, tasks: tasks.filter((t) => t.event_date === date) }))
    .filter((s) => s.tasks.length > 0)

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-400">Totalt framsteg</span>
          <span className="text-sm font-medium text-zinc-300">
            {completedCount} / {totalCount} klara ({pctDone}%)
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-2 bg-amber-500 rounded-full transition-all duration-700"
            style={{ width: `${pctDone}%` }}
          />
        </div>
      </div>

      {sections.map(({ date, tasks: dateTasks }) => (
        <section key={date}>
          <h2 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            {EVENT_DATE_LABELS[date]}
          </h2>

          <div className="space-y-2">
            {dateTasks.map((task) => {
              const areaColor = AREA_COLORS[task.area] ?? 'bg-zinc-700/40 text-zinc-400 border-zinc-600'
              const borderLeft = AREA_BORDER[task.area] ?? 'border-l-zinc-500'

              return (
                <div
                  key={task.id}
                  className={`bg-zinc-900 border border-zinc-800 border-l-4 ${borderLeft} rounded-lg px-4 py-3 flex items-start gap-3`}
                >
                  {/* Tid */}
                  <div className="shrink-0 w-16 text-xs text-zinc-500 pt-0.5 font-mono">
                    {task.start_time ? (
                      <>
                        {task.start_time}
                        {task.end_time && (
                          <span className="block">{task.end_time}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-zinc-700">Flexibel</span>
                    )}
                  </div>

                  {/* Titel + område + beskrivning */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-medium text-zinc-100 leading-snug">
                        {task.title}
                      </p>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${areaColor}`}>
                        {task.area}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[task.status]} ${task.status === 'pågår' ? 'animate-pulse' : ''}`}
                    >
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
