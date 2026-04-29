'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  async function sendOtp(targetEmail: string) {
    setSending(true)
    setSendError(null)
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail }),
    })
    setSending(false)
    if (!res.ok) {
      const data = await res.json()
      setSendError(data.error || 'Något gick fel. Försök igen.')
      return false
    }
    return true
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    const ok = await sendOtp(email.trim().toLowerCase())
    if (ok) {
      setCodeSent(true)
      setCode('')
      setVerifyError(null)
      setResendCooldown(30)
      setTimeout(() => codeInputRef.current?.focus(), 50)
    }
  }

  async function handleResend() {
    const ok = await sendOtp(email.trim().toLowerCase())
    if (ok) {
      setCode('')
      setVerifyError(null)
      setResendCooldown(30)
      setTimeout(() => codeInputRef.current?.focus(), 50)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    setVerifyError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    })
    setVerifying(false)
    if (error) {
      setVerifyError('Ogiltig eller utgången kod. Försök igen eller skicka en ny kod.')
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

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">

          {/* E-postfält */}
          <form onSubmit={handleSendOtp} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
                E-postadress
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setSendError(null) }}
                required
                autoComplete="email"
                placeholder="din@epost.se"
                disabled={codeSent}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            {sendError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
                {sendError}
              </p>
            )}

            <button
              type="submit"
              disabled={sending || !email || codeSent}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {sending ? 'Skickar...' : codeSent ? 'Kod skickad ✓' : 'Skicka kod'}
            </button>
          </form>

          {/* Kodfält – visas direkt under när koden skickats */}
          {codeSent && (
            <form onSubmit={handleVerifyOtp} className="space-y-3 pt-2 border-t border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500 mb-3">
                  En inloggningskod har skickats till{' '}
                  <span className="text-zinc-300 font-medium">{email}</span>.
                </p>
                <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
                  Öppna din mejlapp, kopiera koden och klistra in här.
                </p>
                <label htmlFor="code" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Inloggningskod (8 siffror)
                </label>
                <input
                  ref={codeInputRef}
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setVerifyError(null) }}
                  required
                  autoComplete="one-time-code"
                  placeholder="12345678"
                  maxLength={8}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent tracking-widest text-center font-mono text-lg"
                />
              </div>

              {verifyError && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
                  {verifyError}
                </p>
              )}

              <button
                type="submit"
                disabled={verifying || code.length < 8}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {verifying ? 'Verifierar...' : 'Logga in'}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => { setCodeSent(false); setCode(''); setVerifyError(null); setSendError(null) }}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Fel e-postadress?
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={sending || resendCooldown > 0}
                  className="text-xs text-zinc-500 hover:text-amber-400 disabled:text-zinc-700 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? 'Skickar...' : resendCooldown > 0 ? `Skicka ny kod (${resendCooldown}s)` : 'Skicka ny kod'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
