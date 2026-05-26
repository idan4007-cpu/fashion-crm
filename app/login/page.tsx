'use client'
import { useState } from 'react'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)

  function handleLogin() {
    if (password === process.env.NEXT_PUBLIC_APP_PASSWORD) {
      localStorage.setItem('crm_auth', 'true')
      window.location.href = '/'
    } else {
      setError('סיסמה שגויה')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">👗</p>
          <h1 className="text-2xl font-bold text-gray-800">Fashion CRM</h1>
          <p className="text-gray-500 text-sm mt-1">הכנס סיסמה להמשך</p>
        </div>

        <div className="relative mb-3">
          <input
            type={show ? 'text' : 'password'}
            placeholder="סיסמה"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border rounded-xl px-4 py-3 text-sm text-center pr-12"
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute left-3 top-3 text-gray-400 text-lg">
            {show ? '🙈' : '👁️'}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

        <button
          onClick={handleLogin}
          className="w-full bg-purple-600 text-white py-3 rounded-xl text-sm font-bold">
          כניסה
        </button>
      </div>
    </div>
  )
}
