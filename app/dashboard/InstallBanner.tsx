'use client'

import { useEffect, useState } from 'react'

type BannerState = 'hidden' | 'android' | 'ios'

export default function InstallBanner() {
  const [state, setState] = useState<BannerState>('hidden')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prompt, setPrompt] = useState<any>(null)

  useEffect(() => {
    // Already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Previously dismissed
    if (localStorage.getItem('pwa-dismissed')) return

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
    if (isIOS) {
      setState('ios')
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
      setState('android')
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-dismissed', '1')
    setState('hidden')
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    setState('hidden')
    setPrompt(null)
  }

  if (state === 'hidden') return null

  return (
    <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zinc-200 mb-0.5">Lägg till på hemskärmen</p>
        {state === 'ios' ? (
          <p className="text-xs text-zinc-400">
            Tryck på <span className="text-zinc-200">Dela-knappen</span> (□↑) och välj{' '}
            <span className="text-zinc-200">&quot;Lägg till på hemskärmen&quot;</span> för att installera appen.
          </p>
        ) : (
          <p className="text-xs text-zinc-400">
            Installera appen för snabbare åtkomst – fungerar även offline.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {state === 'android' && (
          <button
            onClick={install}
            className="text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Installera
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5"
          aria-label="Stäng"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
