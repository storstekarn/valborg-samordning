import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Valborg Infra 2026',
  description: 'Samordningsapp för infrastrukturgruppen – Valborgsmässoafton',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  )
}
