'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname === '/login') return
    const auth = localStorage.getItem('crm_auth')
    if (!auth) {
      router.push('/login')
    }
  }, [pathname])

  return (
    <html lang="he" dir="rtl">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
