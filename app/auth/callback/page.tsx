'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleAuth = async () => {
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error) {
            router.push('/dashboard')
            return
          }
        }
      }
      router.push('/auth/login?error=session_error')
    }

    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-400 text-sm">Loggar in...</p>
    </div>
  )
}
