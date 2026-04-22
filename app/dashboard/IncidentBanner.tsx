'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Incident, IncidentCategory } from '@/lib/types'

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  brand:    'Brand',
  el:       'El',
  logistik: 'Logistik',
  övrigt:   'Övrigt',
}

interface Props {
  initialIncidents: Incident[]
}

export default function IncidentBanner({ initialIncidents }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('incidents:active')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          const inc = payload.new as Incident
          if (inc.status === 'ny' || inc.status === 'hanteras') {
            setIncidents(prev => {
              if (prev.some(x => x.id === inc.id)) return prev
              return [inc, ...prev]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents' },
        (payload) => {
          const inc = payload.new as Incident
          setIncidents(prev => {
            // Remove if resolved, update if still active
            if (inc.status === 'löst') {
              return prev.filter(x => x.id !== inc.id)
            }
            // Update or add
            const exists = prev.some(x => x.id === inc.id)
            if (exists) {
              return prev.map(x => x.id === inc.id ? inc : x)
            }
            return [inc, ...prev]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (incidents.length === 0) return null

  return (
    <div className="space-y-2">
      {incidents.map(inc => (
        <div
          key={inc.id}
          className="border border-red-800 bg-red-950/40 rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
              Incident
            </span>
            <span className="text-xs bg-red-900/60 text-red-300 rounded px-1.5 py-0.5 font-medium">
              {CATEGORY_LABELS[inc.category]}
            </span>
            {inc.status === 'hanteras' && (
              <span className="text-xs bg-amber-900/60 text-amber-300 rounded px-1.5 py-0.5 font-medium">
                Hanteras
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-100 leading-snug">{inc.message}</p>
          {inc.admin_comment && (
            <p className="mt-1.5 text-xs text-amber-300 border-t border-red-800/60 pt-1.5">
              <span className="font-semibold">Admin: </span>{inc.admin_comment}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
