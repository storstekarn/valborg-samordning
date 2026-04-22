'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')

    if (code) {
      // PKCE flow: exchange code for session server-side
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        router.replace(error ? '/auth/login?error=exchange_failed' : '/dashboard')
      })
      return
    }

    // Implicit flow: Supabase JS client automatically reads #access_token from the URL
    // hash when initialized. onAuthStateChange fires as soon as the token is processed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        clearTimeout(timer)
        router.replace('/dashboard')
      }
    })

    // Fallback: if no SIGNED_IN event within 3s, try getSession directly
    const timer = setTimeout(async () => {
      subscription.unsubscribe()
      const { data: { session } } = await supabase.auth.getSession()
      router.replace(session ? '/dashboard' : '/auth/login?error=session_error')
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [router, searchParams])

  return null
}

export default function CallbackPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-400 text-sm">Loggar in...</p>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  )
}
