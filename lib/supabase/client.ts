import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Browser-klient för Realtime, Broadcast och Presence.
// Vi använder INTE Supabase Auth längre – autoRefreshToken och persistSession
// är avstängda för att förhindra refresh_token_not_found-fel från gamla
// sessioner lagrade i localStorage.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
