import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Enkel anon-klient för server-side läsning av publik data.
// Använder INTE @supabase/ssr – den försöker refresha Supabase Auth-tokens
// från cookies vilket orsakar refresh_token_not_found-fel sedan vi bytte
// till eget cookie-baserat inloggningsflöde.
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// Service role-klient för server-side admin-reads (kringgår RLS).
// Identisk med createAdminClient men behålls async för bakåtkompatibilitet.
export async function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
