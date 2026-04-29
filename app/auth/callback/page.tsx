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
      console.log('[auth/callback] start', {
        href: window.location.href,
        hash: window.location.hash,
        search: window.location.search,
      })

      // --- Strategy 1: hash fragment (implicit / PKCE token response) ---
      const hash = window.location.hash
      if (hash && hash.length > 1) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const errorParam = params.get('error')
        const errorDescription = params.get('error_description')

        console.log('[auth/callback] hash params', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          errorParam,
          errorDescription,
        })

        if (errorParam) {
          console.error('[auth/callback] provider returned error in hash', errorParam, errorDescription)
          router.push(`/auth/login?error=${encodeURIComponent(errorParam)}`)
          return
        }

        if (accessToken && refreshToken) {
          console.log('[auth/callback] calling setSession...')
          const result = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          console.log('[auth/callback] setSession result', {
            userId: result.data?.session?.user?.id ?? null,
            error: result.error ? { message: result.error.message, status: result.error.status } : null,
          })

          if (!result.error) {
            console.log('[auth/callback] setSession OK – redirecting to /dashboard')
            router.push('/dashboard')
            return
          }
          console.warn('[auth/callback] setSession failed, will try fallback strategies')
        } else {
          console.warn('[auth/callback] hash present but missing access_token or refresh_token')
        }
      }

      // --- Strategy 2: PKCE code in query string ---
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')
      console.log('[auth/callback] query code present:', !!code)

      if (code) {
        console.log('[auth/callback] calling exchangeCodeForSession...')
        const result = await supabase.auth.exchangeCodeForSession(code)
        console.log('[auth/callback] exchangeCodeForSession result', {
          userId: result.data?.session?.user?.id ?? null,
          error: result.error ? { message: result.error.message, status: result.error.status } : null,
        })

        if (!result.error) {
          console.log('[auth/callback] exchangeCodeForSession OK – redirecting to /dashboard')
          router.push('/dashboard')
          return
        }
        console.error('[auth/callback] exchangeCodeForSession failed', result.error)
      }

      // --- Fallback: check if already authenticated ---
      console.log('[auth/callback] checking existing session...')
      const { data: sessionData } = await supabase.auth.getSession()
      console.log('[auth/callback] getSession result', {
        userId: sessionData?.session?.user?.id ?? null,
      })

      if (sessionData?.session) {
        console.log('[auth/callback] already authenticated – redirecting to /dashboard')
        router.push('/dashboard')
        return
      }

      console.error('[auth/callback] all strategies exhausted – redirecting to login with session_error')
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
