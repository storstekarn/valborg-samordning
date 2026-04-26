let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch {
      return null
    }
  }
  return _ctx
}

export function unlockAudio(): void {
  const c = getCtx()
  if (c?.state === 'suspended') c.resume()
}

function soundEnabled(): boolean {
  try {
    return localStorage.getItem('sound_enabled') !== 'false'
  } catch {
    return true
  }
}

export async function playMessageSound(): Promise<void> {
  if (!soundEnabled()) return
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') {
    try { await c.resume() } catch { return }
  }
  const now = c.currentTime
  // Two ascending sine tones – gentle "pling"
  ;([[880, 0, 0.25], [1100, 0.12, 0.2]] as [number, number, number][]).forEach(([freq, delay, vol]) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, now + delay)
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35)
    osc.start(now + delay)
    osc.stop(now + delay + 0.35)
  })
}

export async function playIncidentSound(): Promise<void> {
  if (!soundEnabled()) return
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') {
    try { await c.resume() } catch { return }
  }
  const now = c.currentTime
  // Three descending square-wave pulses – clear alert
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.22
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = 'square'
    osc.frequency.value = 520 - i * 60
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.start(t)
    osc.stop(t + 0.18)
  }
}

export function showNotification(title: string, body: string): void {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/icon.svg' })
  } catch {}
}

export async function requestNotificationPermission(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}
