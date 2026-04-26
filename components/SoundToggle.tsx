'use client'

import { useEffect, useState } from 'react'
import { unlockAudio, requestNotificationPermission } from '@/lib/notifications'

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    try {
      if (localStorage.getItem('sound_enabled') === 'false') setEnabled(false)
    } catch {}

    requestNotificationPermission()

    const unlock = () => unlockAudio()
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    try { localStorage.setItem('sound_enabled', String(next)) } catch {}
    unlockAudio()
  }

  return (
    <button
      onClick={toggle}
      title={enabled ? 'Stäng av ljud' : 'Slå på ljud'}
      className="text-base px-2 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
      aria-label={enabled ? 'Stäng av ljud' : 'Slå på ljud'}
    >
      {enabled ? '🔔' : '🔕'}
    </button>
  )
}
