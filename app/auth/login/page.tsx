'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Något gick fel. Försök igen.')
    } else {
      setStep('otp')
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    })

    setLoading(false)

    if (verifyError) {
      setError('Ogiltig eller utgången kod. Kontrollera koden och försök igen.')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-amber-400">Valborg Infra 2026</h1>
          <p className="text-zinc-400 text-sm mt-2">Logga in med din e-postadress</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
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
              {loading ? 'Skickar...' : 'Skicka kod'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div>
              <p className="text-sm text-zinc-400 mb-4">
                En inloggningskod har skickats till{' '}
                <span className="text-zinc-200 font-medium">{email}</span>.
              </p>
              <label htmlFor="code" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Ange din inloggningskod
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoComplete="one-time-code"
                placeholder="12345678"
                maxLength={8}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent tracking-widest text-center font-mono text-lg"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Verifierar...' : 'Logga in'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError(null) }}
              className="w-full text-zinc-500 hover:text-zinc-300 text-xs py-1 transition-colors"
            >
              Fel e-postadress? Gå tillbaka
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
