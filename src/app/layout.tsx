import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Weekly Organizer',
  description: 'AI-Assisted GTD — personal weekly planner',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
