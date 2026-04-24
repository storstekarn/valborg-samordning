'use client'

import { useState, useMemo } from 'react'
import { sortTasks } from '@/lib/sortTasks'
import type { Task, Profile, PendingVolEntry, EventDate, UserRole } from '@/lib/types'

interface Assignment {
  task_id: string
  profile_id: string
}

interface PendingAssignment {
  task_id: string
  email: string
}

// Enhetlig volontärpost – inloggad (profil) eller väntande (pending)
type VEntry = {
  key: string       // "p:{uuid}" eller "pending:{email}"
  id: string | null // profile UUID om inloggad, annars null
  email: string
  name: string | null
  phone: string | null
  role: UserRole
  loggedIn: boolean
}

interface Props {
  initialTasks: Task[]
  initialProfiles: Profile[]
  initialAssignments: Assignment[]
  initialPendingVols: PendingVolEntry[]
  initialPendingTaskAssignments: PendingAssignment[]
}

type Tab = 'uppgifter' | 'volontarer' | 'ny-uppgift'

const DATE_LABELS: Record<EventDate, string> = {
  fore:    'Dagen före (30/4)',
  valborg: 'Valborg (30/4 kväll)',
  '1maj':  '1 maj',
}

const DATE_ORDER: EventDate[] = ['fore', 'valborg', '1maj']

const INPUT = 'w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500'

export default function RedigeraClient({
  initialTasks,
  initialProfiles,
  initialAssignments,
  initialPendingVols,
  initialPendingTaskAssignments,
}: Props) {
  const [tab, setTab] = useState<Tab>('uppgifter')
  const [tasks, setTasks] = useState(initialTasks)
  const [profiles, setProfiles] = useState(initialProfiles)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [pendingVols, setPendingVols] = useState(initialPendingVols)
  const [pendingTaskAssignments, setPendingTaskAssignments] = useState(initialPendingTaskAssignments)

  // ─── Task editing ────────────────────────────────────────────────────────────
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Task>>({})
  const [taskSaving, setTaskSaving] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [taskSaved, setTaskSaved] = useState(false)
  const [addingVolKey, setAddingVolKey] = useState('')

  // ─── Volunteer form ──────────────────────────────────────────────────────────
  const [showVolForm, setShowVolForm] = useState(false)
  const [volForm, setVolForm] = useState({
    name: '', email: '', phone: '', role: 'volunteer' as UserRole, taskIds: [] as string[],
  })
  const [volSaving, setVolSaving] = useState(false)
  const [volError, setVolError] = useState<string | null>(null)
  const [volSuccess, setVolSuccess] = useState<string | null>(null)

  // ─── New task form ───────────────────────────────────────────────────────────
  const [newTaskForm, setNewTaskForm] = useState({
    title: '', area: '', description: '',
    event_date: 'valborg' as EventDate, start_time: '', end_time: '',
  })
  const [newTaskSaving, setNewTaskSaving] = useState(false)
  const [newTaskError, setNewTaskError] = useState<string | null>(null)

  const existingAreas = useMemo(() => [...new Set(tasks.map(t => t.area))].sort(), [tasks])

  const tasksByDate = useMemo(() => {
    const map: Partial<Record<EventDate, Task[]>> = {}
    for (const t of tasks) {
      if (!map[t.event_date]) map[t.event_date] = []
      map[t.event_date]!.push(t)
    }
    return map
  }, [tasks])

  // Enhetlig lista: inloggade + väntande
  const allVols = useMemo<VEntry[]>(() => [
    ...profiles.map(p => ({
      key: `p:${p.id}`,
      id: p.id,
      email: p.email,
      name: p.name,
      phone: p.phone,
      role: p.role,
      loggedIn: true,
    })),
    ...pendingVols.map(pv => ({
      key: `pending:${pv.email}`,
      id: null,
      email: pv.email,
      name: pv.name,
      phone: pv.phone,
      role: pv.role,
      loggedIn: false,
    })),
  ], [profiles, pendingVols])

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function assigneesFor(taskId: string): VEntry[] {
    const profileKeys = new Set(
      assignments.filter(a => a.task_id === taskId).map(a => `p:${a.profile_id}`)
    )
    const pendingKeys = new Set(
      pendingTaskAssignments.filter(pa => pa.task_id === taskId).map(pa => `pending:${pa.email}`)
    )
    return allVols.filter(v => profileKeys.has(v.key) || pendingKeys.has(v.key))
  }

  function tasksFor(volKey: string): Task[] {
    if (volKey.startsWith('p:')) {
      const profileId = volKey.slice(2)
      return assignments
        .filter(a => a.profile_id === profileId)
        .map(a => tasks.find(t => t.id === a.task_id))
        .filter((t): t is Task => Boolean(t))
    }
    const email = volKey.slice('pending:'.length)
    return pendingTaskAssignments
      .filter(pa => pa.email === email)
      .map(pa => tasks.find(t => t.id === pa.task_id))
      .filter((t): t is Task => Boolean(t))
  }

  function unassignedFor(taskId: string): VEntry[] {
    const profileIds = new Set(assignments.filter(a => a.task_id === taskId).map(a => a.profile_id))
    const pendingEmails = new Set(pendingTaskAssignments.filter(pa => pa.task_id === taskId).map(pa => pa.email))
    return allVols.filter(v => {
      if (v.loggedIn) return !profileIds.has(v.id!)
      return !pendingEmails.has(v.email)
    })
  }

  // ─── Task editing ────────────────────────────────────────────────────────────

  function selectTask(task: Task) {
    if (selectedTaskId === task.id) {
      setSelectedTaskId(null)
      setEditForm({})
      setTaskError(null)
      setAddingVolKey('')
      return
    }
    setSelectedTaskId(task.id)
    setEditForm({ ...task })
    setTaskError(null)
    setTaskSaved(false)
    setAddingVolKey('')
  }

  async function saveTask() {
    if (!selectedTaskId || taskSaving) return
    const orig = tasks.find(t => t.id === selectedTaskId)
    if (!orig) return
    setTaskSaving(true)
    setTaskError(null)

    const update = {
      title: (editForm.title ?? orig.title).trim(),
      area: (editForm.area ?? orig.area).trim(),
      description: editForm.description?.trim() || null,
      event_date: editForm.event_date ?? orig.event_date,
      start_time: editForm.start_time?.trim() || null,
      end_time: editForm.end_time?.trim() || null,
    }

    const res = await fetch(`/api/admin/tasks/${selectedTaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    setTaskSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setTaskError(d.error || 'Fel vid sparande')
      return
    }
    setTasks(prev => sortTasks(prev.map(t => t.id === selectedTaskId ? { ...t, ...update } : t)))
    setTaskSaved(true)
    setTimeout(() => setTaskSaved(false), 2000)
  }

  // ─── Assignment management ───────────────────────────────────────────────────

  async function addAssignment(taskId: string, volKey: string) {
    if (!volKey) return
    if (volKey.startsWith('p:')) {
      const profileId = volKey.slice(2)
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, profile_id: profileId }),
      })
      if (res.ok) {
        setAssignments(prev => [...prev, { task_id: taskId, profile_id: profileId }])
        setAddingVolKey('')
      }
    } else if (volKey.startsWith('pending:')) {
      const email = volKey.slice('pending:'.length)
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, email }),
      })
      if (res.ok) {
        setPendingTaskAssignments(prev => [...prev, { task_id: taskId, email }])
        setAddingVolKey('')
      }
    }
  }

  async function removeAssignment(taskId: string, volKey: string) {
    if (volKey.startsWith('p:')) {
      const profileId = volKey.slice(2)
      const res = await fetch('/api/admin/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, profile_id: profileId }),
      })
      if (res.ok) {
        setAssignments(prev => prev.filter(a => !(a.task_id === taskId && a.profile_id === profileId)))
      }
    } else if (volKey.startsWith('pending:')) {
      const email = volKey.slice('pending:'.length)
      const res = await fetch('/api/admin/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, email }),
      })
      if (res.ok) {
        setPendingTaskAssignments(prev => prev.filter(pa => !(pa.task_id === taskId && pa.email === email)))
      }
    }
  }

  // ─── Volunteer creation ──────────────────────────────────────────────────────

  async function submitVolunteer(e: React.FormEvent) {
    e.preventDefault()
    setVolSaving(true)
    setVolError(null)
    setVolSuccess(null)
    const res = await fetch('/api/admin/volunteers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(volForm),
    })
    setVolSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setVolError(d.error || 'Fel vid skapande')
      return
    }
    const data = await res.json()

    if (data.type === 'profile') {
      // Inloggad användare – uppdatera profiles + assignments
      const { profile_id, profile } = data
      setProfiles(prev => {
        const exists = prev.find(p => p.id === profile_id)
        return exists
          ? prev.map(p => p.id === profile_id ? { ...p, ...profile } : p)
          : [...prev, profile]
      })
      for (const taskId of volForm.taskIds) {
        if (!assignments.find(a => a.task_id === taskId && a.profile_id === profile_id)) {
          setAssignments(prev => [...prev, { task_id: taskId, profile_id }])
        }
      }
      setVolSuccess(`${data.profile.name} har uppdaterats.`)
    } else {
      // Ny pending-volontär
      const { email, name, phone, role, taskIds } = data
      const emailLower = email.toLowerCase()
      setPendingVols(prev => {
        const exists = prev.find(pv => pv.email === emailLower)
        const entry: PendingVolEntry = { email: emailLower, name, phone, role }
        return exists
          ? prev.map(pv => pv.email === emailLower ? entry : pv)
          : [...prev, entry]
      })
      for (const taskId of (taskIds ?? []) as string[]) {
        if (!pendingTaskAssignments.find(pa => pa.task_id === taskId && pa.email === emailLower)) {
          setPendingTaskAssignments(prev => [...prev, { task_id: taskId, email: emailLower }])
        }
      }
      setVolSuccess(`${name} har lagts till (inbjudan väntar).`)
    }

    setVolForm({ name: '', email: '', phone: '', role: 'volunteer', taskIds: [] })
    setShowVolForm(false)
  }

  // ─── New task ────────────────────────────────────────────────────────────────

  async function submitNewTask(e: React.FormEvent) {
    e.preventDefault()
    setNewTaskSaving(true)
    setNewTaskError(null)
    const res = await fetch('/api/admin/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTaskForm),
    })
    setNewTaskSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setNewTaskError(d.error || 'Fel vid skapande')
      return
    }
    const task: Task = await res.json()
    setTasks(prev => sortTasks([...prev, task]))
    setNewTaskForm({ title: '', area: '', description: '', event_date: 'valborg', start_time: '', end_time: '' })
    setTab('uppgifter')
    setSelectedTaskId(task.id)
    setEditForm({ ...task })
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {(['uppgifter', 'volontarer', 'ny-uppgift'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
              tab === t ? 'bg-amber-500 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t === 'uppgifter' && `Uppgifter (${tasks.length})`}
            {t === 'volontarer' && `Volontärer (${profiles.length + pendingVols.length})`}
            {t === 'ny-uppgift' && 'Ny uppgift'}
          </button>
        ))}
      </div>

      {/* ── Uppgifter ─────────────────────────────────────────────────────────── */}
      {tab === 'uppgifter' && (
        <div className="space-y-6">
          {DATE_ORDER.map(date => {
            const dateTasks = tasksByDate[date]
            if (!dateTasks?.length) return null
            return (
              <div key={date}>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  {DATE_LABELS[date]}
                </h3>
                <div className="space-y-1">
                  {dateTasks.map(task => {
                    const isOpen = selectedTaskId === task.id
                    const assignees = assigneesFor(task.id)
                    const unassigned = unassignedFor(task.id)
                    return (
                      <div key={task.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <button
                          onClick={() => selectTask(task)}
                          className="w-full text-left p-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm text-zinc-100 font-medium truncate">
                              {isOpen && editForm.title ? editForm.title : task.title}
                            </span>
                            <span className="text-xs text-zinc-500 shrink-0">{task.area}</span>
                            {task.start_time && (
                              <span className="text-xs text-zinc-600 font-mono shrink-0">
                                {task.start_time}{task.end_time ? `–${task.end_time}` : ''}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {assignees.length > 0 && (
                              <span className="text-xs text-zinc-500">
                                {assignees.length} tilldelad{assignees.length !== 1 ? 'e' : ''}
                              </span>
                            )}
                            <span className="text-zinc-600 text-xs">{isOpen ? '▲' : '▼'}</span>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t border-zinc-800 p-4 space-y-5 bg-zinc-900/60">
                            {/* Edit fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Titel</label>
                                <input type="text" value={editForm.title ?? ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className={INPUT} />
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Område</label>
                                <input type="text" list="areas-list" value={editForm.area ?? ''} onChange={e => setEditForm(f => ({ ...f, area: e.target.value }))} className={INPUT} />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-xs text-zinc-400 mb-1">Beskrivning</label>
                                <input type="text" value={editForm.description ?? ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Valfri" className={INPUT} />
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Datum</label>
                                <select value={editForm.event_date ?? 'valborg'} onChange={e => setEditForm(f => ({ ...f, event_date: e.target.value as EventDate }))} className={INPUT}>
                                  {DATE_ORDER.map(d => <option key={d} value={d}>{DATE_LABELS[d]}</option>)}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="block text-xs text-zinc-400 mb-1">Start</label>
                                  <input type="time" value={editForm.start_time ?? ''} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))} className={INPUT} />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs text-zinc-400 mb-1">Slut</label>
                                  <input type="time" value={editForm.end_time ?? ''} onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))} className={INPUT} />
                                </div>
                              </div>
                            </div>

                            {taskError && (
                              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{taskError}</p>
                            )}

                            <button
                              onClick={saveTask}
                              disabled={taskSaving}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 transition-colors"
                            >
                              {taskSaving ? 'Sparar...' : taskSaved ? 'Sparat ✓' : 'Spara ändringar'}
                            </button>

                            {/* Assignees */}
                            <div>
                              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Tilldelade</p>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {assignees.map(v => (
                                  <span key={v.key} className="flex items-center gap-1 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded-lg">
                                    {v.name ?? v.email}
                                    {!v.loggedIn && (
                                      <span className="text-zinc-600 text-[10px] ml-0.5">(ej inloggad)</span>
                                    )}
                                    <button
                                      onClick={() => removeAssignment(task.id, v.key)}
                                      className="text-zinc-500 hover:text-red-400 transition-colors ml-0.5 leading-none"
                                      title="Ta bort tilldelning"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                                {assignees.length === 0 && (
                                  <span className="text-xs text-zinc-600">Ingen tilldelad</span>
                                )}
                              </div>
                              {unassigned.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={addingVolKey}
                                    onChange={e => setAddingVolKey(e.target.value)}
                                    className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  >
                                    <option value="">Lägg till volontär…</option>
                                    {unassigned.map(v => (
                                      <option key={v.key} value={v.key}>
                                        {v.name ?? v.email}{!v.loggedIn ? ' (ej inloggad)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => addAssignment(task.id, addingVolKey)}
                                    disabled={!addingVolKey}
                                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-40 transition-colors"
                                  >
                                    Lägg till
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Volontärer ────────────────────────────────────────────────────────── */}
      {tab === 'volontarer' && (
        <div className="space-y-4">
          {volSuccess && (
            <div className="bg-green-950/30 border border-green-800 text-green-400 rounded-xl px-4 py-3 text-xs">
              {volSuccess}
            </div>
          )}

          {/* Add form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <button
              onClick={() => { setShowVolForm(f => !f); setVolError(null) }}
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
            >
              <span className="text-sm font-medium text-zinc-200">+ Lägg till volontär</span>
              <span className="text-zinc-600 text-xs">{showVolForm ? '▲' : '▼'}</span>
            </button>

            {showVolForm && (
              <form onSubmit={submitVolunteer} className="border-t border-zinc-800 p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Namn *</label>
                    <input type="text" required value={volForm.name} onChange={e => setVolForm(f => ({ ...f, name: e.target.value }))} placeholder="Förnamn Efternamn" className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">E-post *</label>
                    <input type="email" required value={volForm.email} onChange={e => setVolForm(f => ({ ...f, email: e.target.value }))} placeholder="namn@exempel.se" className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Telefon</label>
                    <input type="tel" value={volForm.phone} onChange={e => setVolForm(f => ({ ...f, phone: e.target.value }))} placeholder="070-000 00 00" className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Roll</label>
                    <select value={volForm.role} onChange={e => setVolForm(f => ({ ...f, role: e.target.value as UserRole }))} className={INPUT}>
                      <option value="volunteer">Volontär</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                {tasks.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-400 mb-2">Tilldela uppgifter (valfritt)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                      {tasks.map(t => (
                        <label key={t.id} className="flex items-start gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={volForm.taskIds.includes(t.id)}
                            onChange={e => setVolForm(f => ({
                              ...f,
                              taskIds: e.target.checked
                                ? [...f.taskIds, t.id]
                                : f.taskIds.filter(id => id !== t.id),
                            }))}
                            className="mt-0.5 accent-amber-500 shrink-0"
                          />
                          <span className="text-xs text-zinc-300 leading-tight group-hover:text-zinc-100">
                            {t.title}
                            <span className="text-zinc-500 ml-1">({t.area})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {volError && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{volError}</p>
                )}

                <button
                  type="submit"
                  disabled={volSaving}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-40 transition-colors"
                >
                  {volSaving ? 'Sparar...' : 'Lägg till volontär'}
                </button>
              </form>
            )}
          </div>

          {/* Volunteer list – alla, inloggade och väntande */}
          <div className="space-y-2">
            {allVols.length === 0 && (
              <p className="text-sm text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                Inga volontärer registrerade ännu.
              </p>
            )}
            {allVols.map(vol => {
              const vtasks = tasksFor(vol.key)
              return (
                <div key={vol.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{vol.name ?? '(inget namn)'}</p>
                      <p className="text-xs text-zinc-500">{vol.email}</p>
                      {vol.phone && <p className="text-xs text-zinc-600">{vol.phone}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        vol.loggedIn
                          ? 'bg-green-500/15 border-green-700 text-green-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                      }`}>
                        {vol.loggedIn ? 'Inloggad' : 'Ej inloggad'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        vol.role === 'admin'
                          ? 'bg-amber-500/20 border-amber-700 text-amber-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                      }`}>
                        {vol.role === 'admin' ? 'Admin' : 'Volontär'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vtasks.map(t => (
                      <span key={t.id} className="flex items-center gap-1 text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2.5 py-1 rounded-lg">
                        {t.title}
                        <button
                          onClick={() => removeAssignment(t.id, vol.key)}
                          className="text-zinc-600 hover:text-red-400 transition-colors leading-none"
                          title="Ta bort uppgiftstilldelning"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {vtasks.length === 0 && (
                      <span className="text-xs text-zinc-600">Inga uppgifter tilldelade</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Ny uppgift ────────────────────────────────────────────────────────── */}
      {tab === 'ny-uppgift' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Lägg till ny uppgift</h3>
          <form onSubmit={submitNewTask} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Titel *</label>
                <input type="text" required value={newTaskForm.title} onChange={e => setNewTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Beskrivande titel" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Område *</label>
                <input type="text" required list="areas-list" value={newTaskForm.area} onChange={e => setNewTaskForm(f => ({ ...f, area: e.target.value }))} placeholder="t.ex. Scen" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Datum *</label>
                <select value={newTaskForm.event_date} onChange={e => setNewTaskForm(f => ({ ...f, event_date: e.target.value as EventDate }))} className={INPUT}>
                  {DATE_ORDER.map(d => <option key={d} value={d}>{DATE_LABELS[d]}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">Beskrivning</label>
                <input type="text" value={newTaskForm.description} onChange={e => setNewTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Valfri" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Starttid</label>
                <input type="time" value={newTaskForm.start_time} onChange={e => setNewTaskForm(f => ({ ...f, start_time: e.target.value }))} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Sluttid</label>
                <input type="time" value={newTaskForm.end_time} onChange={e => setNewTaskForm(f => ({ ...f, end_time: e.target.value }))} className={INPUT} />
              </div>
            </div>

            {newTaskError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{newTaskError}</p>
            )}

            <button
              type="submit"
              disabled={newTaskSaving}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-40 transition-colors"
            >
              {newTaskSaving ? 'Sparar...' : 'Skapa uppgift'}
            </button>
          </form>
        </div>
      )}

      <datalist id="areas-list">
        {existingAreas.map(area => <option key={area} value={area} />)}
      </datalist>
    </div>
  )
}
