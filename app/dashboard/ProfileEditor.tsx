'use client'

import { useState } from 'react'

interface Props {
  profileId: string
  initialName: string | null
  initialPhone: string | null
}

export default function ProfileEditor({ initialName, initialPhone }: Props) {
  const [name, setName] = useState(initialName ?? '')
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
    } else {
      setError('Kunde inte spara. Försök igen.')
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div>
        <label htmlFor="profile-name" className="block text-xs font-medium text-zinc-400 mb-1">
          Namn
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false) }}
          placeholder="Ditt namn"
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      <div>
        <label htmlFor="profile-phone" className="block text-xs font-medium text-zinc-400 mb-1">
          Telefon
        </label>
        <input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); setSaved(false) }}
          placeholder="07X-XXX XX XX"
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="text-xs font-medium bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Sparar...' : 'Spara'}
        </button>
        {saved && <span className="text-xs text-green-400">Sparat!</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </form>
  )
}
