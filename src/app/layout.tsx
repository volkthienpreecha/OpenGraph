import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Sidebar } from '@/components/sidebar'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'OpenGraph — Personal Intelligence Graph',
  description: 'Turn your personal data into a queryable knowledge graph.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{ colorScheme: 'dark' }}
    >
      <meta name="theme-color" content="#000000" />
      <body className="flex min-h-screen bg-black text-white font-[family-name:var(--font-geist-sans)]">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </body>
    </html>
  )
}
