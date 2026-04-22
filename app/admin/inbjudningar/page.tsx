import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminSendInvites from '../AdminSendInvites'

export default async function AdminInbjudningarPage() {
  const supabase = createAdminClient()

  const { data: rows } = await supabase
    .from('pending_assignments')
    .select('email')

  const recipientCount = new Set(
    (rows ?? []).map((r: { email: string }) => r.email.toLowerCase())
  ).size

  async function handleLogout() {
    'use server'
    const { cookies } = await import('next/headers')
    const { redirect } = await import('next/navigation')
    const cookieStore = await cookies()
    cookieStore.delete('admin_token')
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors">
              ← Admin
            </Link>
            <div>
              <h1 className="text-base font-bold text-amber-400">Skicka inbjudningar</h1>
              <p className="text-xs text-zinc-500">{recipientCount} mottagare i pending_assignments</p>
            </div>
          </div>
          <form action={handleLogout}>
            <button type="submit" className="text-xs text-zinc-500 hover:text-zinc-300">Logga ut</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <AdminSendInvites recipientCount={recipientCount} />
      </main>
    </div>
  )
}
