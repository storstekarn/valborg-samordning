import { createClient } from '@supabase/supabase-js'

// Ren admin-klient utan SSR/cookie-lager.
// Använder service role key – kringgår alltid RLS.
// Använd ENBART server-side (API-routes, server actions).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
