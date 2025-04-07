import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VRChat Instance FPS Debugger',
  description: 'A tool for debugging FPS in VRChat instances over time for performance analysis.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
