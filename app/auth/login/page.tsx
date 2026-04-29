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
  const [sessionChecking, setSessionChecking] = useState(true)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Redirecta till /dashboard om användaren redan är inloggad.
  // Använder getUser() (nätverksvalidering) istället för getSession() (läser bara
  // localStorage) för att undvika redirect-loop när servern och klienten är osynkade.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace('/dashboard')
      } else {
        setSessionChecking(false)
      }
    })
  }, [router])

  // Återställ e-post från sessionStorage vid sidladdning
  useEffect(() => {
    const saved = sessionStorage.getItem('otp_email')
    const savedSent = sessionStorage.getItem('otp_sent')
    if (saved) setEmail(saved)
    if (savedSent === '1') setCodeSent(true)
  }, [])

  // Spara e-post i sessionStorage
  useEffect(() => {
    if (email) sessionStorage.setItem('otp_email', email)
  }, [email])

  useEffect(() => {
    if (codeSent) sessionStorage.setItem('otp_sent', '1')
    else sessionStorage.removeItem('otp_sent')
  }, [codeSent])

  // Auto-paste: läs clipboard när sidan får fokus igen
  useEffect(() => {
    if (!codeSent) return

    async function tryPaste() {
      if (!document.hasFocus()) return
      try {
        const text = await navigator.clipboard.readText()
        const digits = text.replace(/\D/g, '')
        if (digits.length === 8) {
          setCode(digits)
          setVerifyError(null)
        }
      } catch {
        // Clipboard-åtkomst nekad – inget att göra
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') tryPaste()
    }

    function onFocus() {
      tryPaste()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [codeSent])

  // Cooldown-räknare
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
      sessionStorage.removeItem('otp_email')
      sessionStorage.removeItem('otp_sent')
      router.push('/dashboard')
    }
  }

  function handleReset() {
    setCodeSent(false)
    setCode('')
    setVerifyError(null)
    setSendError(null)
    sessionStorage.removeItem('otp_sent')
  }

  if (sessionChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
      </div>
    )
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

          {/* Kodfält */}
          {codeSent && (
            <form onSubmit={handleVerifyOtp} className="space-y-3 pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                En inloggningskod har skickats till{' '}
                <span className="text-zinc-300 font-medium">{email}</span>.
              </p>

              {/* Clipboard-instruktion */}
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5">
                <p>📋 Öppna mejlet, kopiera koden och klistra in den här.</p>
              </div>

              <div>
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
                  onClick={handleReset}
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
                  {sending
                    ? 'Skickar...'
                    : resendCooldown > 0
                      ? `Skicka ny kod (${resendCooldown}s)`
                      : 'Skicka ny kod'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
