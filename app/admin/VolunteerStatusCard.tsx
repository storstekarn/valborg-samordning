'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Vol { id: string | null; name: string | null; email: string }

interface Props {
  loggedIn: Vol[]
  notLoggedIn: Vol[]
}

export default function VolunteerStatusCard({ loggedIn, notLoggedIn }: Props) {
  const [open, setOpen] = useState(false)
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('online-users')

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ profile_id: string }>()
        const ids = new Set(
          Object.values(state)
            .flat()
            .map(p => p.profile_id)
            .filter(Boolean)
        )
        setActiveIds(ids)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const activeCount = activeIds.size

  return (
    <div
      className={`bg-zinc-900 border rounded-xl text-center cursor-pointer transition-colors select-none
        ${open ? 'border-zinc-600' : 'border-zinc-800 hover:border-zinc-700'}`}
      onClick={() => setOpen(o => !o)}
    >
      {/* Stat */}
      <div className="p-4">
        <p className="text-2xl font-bold text-green-400">{loggedIn.length}</p>
        <p className="text-xs text-zinc-500 mt-1">Volontärer inloggade</p>
        {activeCount > 0 && (
          <p className="text-xs text-green-500 mt-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 align-middle" />
            {activeCount} aktiva nu
          </p>
        )}
        {notLoggedIn.length > 0 && (
          <p className="text-xs text-zinc-600 mt-0.5">{notLoggedIn.length} ej inloggat</p>
        )}
        <p className="text-xs text-amber-400 mt-1">{open ? '▲ Stäng' : '▼ Visa lista'}</p>
      </div>

      {/* Expandable list */}
      {open && (
        <div
          className="border-t border-zinc-800 text-left"
          onClick={e => e.stopPropagation()}
        >
          {/* Inloggade */}
          {loggedIn.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-green-500 uppercase tracking-wider">
                Inloggade ({loggedIn.length})
              </p>
              <ul className="divide-y divide-zinc-800/60">
                {loggedIn.map(v => {
                  const isActive = v.id ? activeIds.has(v.id) : false
                  return (
                    <li key={v.email} className="px-4 py-2 flex items-center gap-2">
                      <div className="relative shrink-0">
                        <div className="w-6 h-6 rounded-full bg-green-500/15 border border-green-800 flex items-center justify-center text-[10px] text-green-400 font-bold">
                          {(v.name ?? v.email).charAt(0).toUpperCase()}
                        </div>
                        {isActive && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-zinc-900" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-200 truncate">{v.name ?? '(inget namn)'}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{v.email}</p>
                      </div>
                      {isActive && (
                        <span className="shrink-0 text-[10px] text-green-500 font-medium">aktiv</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Ej inloggade */}
          {notLoggedIn.length > 0 && (
            <div className={loggedIn.length > 0 ? 'border-t border-zinc-800' : ''}>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Ej inloggat än ({notLoggedIn.length})
              </p>
              <ul className="divide-y divide-zinc-800/60">
                {notLoggedIn.map(v => (
                  <li key={v.email} className="px-4 py-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500 font-bold shrink-0">
                      {(v.name ?? v.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-400 truncate">{v.name ?? '(inget namn)'}</p>
                      <p className="text-[10px] text-zinc-600 truncate">{v.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loggedIn.length === 0 && notLoggedIn.length === 0 && (
            <p className="px-4 py-4 text-xs text-zinc-600">Inga volontärer registrerade.</p>
          )}

          <div className="h-3" />
        </div>
      )}
    </div>
  )
}
