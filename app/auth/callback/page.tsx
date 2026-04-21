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
      // PKCE flow: exchange the code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('[callback] exchangeCodeForSession misslyckades:', error.message)
          router.replace('/auth/login?error=exchange_failed')
        } else {
          router.replace('/dashboard')
        }
      })
    } else {
      // Implicit flow: Supabase JS parses #access_token from the hash automatically
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.replace('/dashboard')
        } else {
          router.replace('/auth/login?error=session_error')
        }
      })
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
