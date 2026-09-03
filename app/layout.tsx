import type { Metadata } from 'next'
import { Newsreader, Schibsted_Grotesk } from 'next/font/google'
import './globals.css'

const sans = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-hm-sans',
  display: 'swap',
})

const display = Newsreader({
  subsets: ['latin'],
  variable: '--font-hm-disp',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Destination Discovery | RosoTravel',
  description:
    'An opinionated, preference-led map from destination inspiration to booking.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  )
}
