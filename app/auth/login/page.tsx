'use client'

import { useState } from 'react'
import InstallBanner from '@/app/dashboard/InstallBanner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Något gick fel. Försök igen.')
    } else {
      setSubmitted(true)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <InstallBanner />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-amber-400">Valborg Infra 2026</h1>
          <p className="text-zinc-400 text-sm mt-2">Logga in med din e-postadress</p>
        </div>

        {submitted ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">📬</div>
            <h2 className="font-semibold text-zinc-100 mb-2">Kolla din inkorg!</h2>
            <p className="text-sm text-zinc-400">
              Vi har skickat en inloggningslänk till{' '}
              <span className="text-zinc-200 font-medium">{email}</span>.
              Klicka på länken i mejlet för att logga in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
                E-postadress
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="din@epost.se"
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Skickar...' : 'Skicka inloggningslänk'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
