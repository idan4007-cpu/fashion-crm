'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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
  const isLogin = pathname === '/login'
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const loggedIn = !!data.session
      setAuthed(loggedIn)
      if (!loggedIn && !isLogin) router.replace('/login')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
      if (!session && window.location.pathname !== '/login') router.replace('/login')
    })
    return () => sub.subscription.unsubscribe()
  }, [isLogin, router])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <html lang="he" dir="rtl">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {isLogin ? children : authed ? (
          <>
            {children}
            <button
              onClick={logout}
              className="fixed bottom-4 left-4 bg-white border shadow rounded-full px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">
              התנתק
            </button>
          </>
        ) : null}
      </body>
    </html>
  )
}
