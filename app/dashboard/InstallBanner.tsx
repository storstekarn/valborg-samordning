'use client'

import { useEffect, useState } from 'react'

export default function InstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa-dismissed')) return
    setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
      <p className="text-xs text-zinc-300 leading-relaxed">
        📱 Spara appen på hemskärmen – tryck på dela-ikonen i Safari och välj{' '}
        <span className="text-zinc-100 font-medium">&quot;Lägg till på hemskärmen&quot;</span>
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1 py-0.5"
        aria-label="Stäng"
      >
        ✕
      </button>
    </div>
  )
}
