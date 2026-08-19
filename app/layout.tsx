import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Destination Discovery | RosoTravel',
  description:
    'An opinionated, preference-led map from destination inspiration to booking.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
