'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type ParsedOrder = {
  name: string
  phone: string
  address: string
  city: string
  zip: string
  order_number: string
  size: string
  color: string
  product: string
  approved: boolean
}

export default function ImportWhatsApp() {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleAnalyze() {
    if (!text.trim()) return
    setAnalyzing(true)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      const data = await response.json()
      setParsed(data.orders.map((o: ParsedOrder) => ({ ...o, product: '', approved: true })))
    } catch (err) {
      alert('שגיאה בניתוח. נסה שוב.')
      console.error(err)
    }

    setAnalyzing(false)
  }

  async function handleSave() {
    setLoading(true)
    const approved = parsed.filter(o => o.approved)

    for (const order of approved) {
      let customerId = ''

      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', order.phone)
        .single()

      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert([{
            name: order.name,
            phone: order.phone,
            city: order.city,
            type: 'new'
          }])
          .select()
          .single()
        if (newCustomer) customerId = newCustomer.id
      }

      if (customerId) {
        await supabase.from('orders').insert([{
          customer_id: customerId,
          product: order.product || 'לא צוין',
          size: order.size || '',
          color: order.color || '',
          status: 'new',
          price: 0,
          cost_price: 0,
          quantity: 1
        }])
      }
    }

    setLoading(false)
    setSaved(true)
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📱 ייבוא מוואטסאפ</h1>
            <p className="text-gray-500 text-sm">AI מנתח את הטקסט אוטומטית</p>
          </div>
          <a href="/" className="text-sm text-gray-500 px-3 py-2">🏠 דשבורד</a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {!parsed.length ? (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-2">הדבק טקסט מהקבוצה</h2>
            <p className="text-sm text-gray-500 mb-4">
              בוואטסאפ: לחץ על שם הקבוצה ← ייצוא צ'אט ← ללא מדיה ← העתק והדבק כאן
            </p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="הדבק כאן את הטקסט מהקבוצה..."
              className="w-full border rounded-lg p-3 text-sm h-64 font-mono"
              dir="ltr"
            />
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || analyzing}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {analyzing ? '🤖 מנתח...' : '🤖 נתח עם AI'}
            </button>
          </div>
        ) : saved ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <p className="text-4xl mb-4">🎉</p>
            <h2 className="text-xl font-bold text-green-800 mb-2">נשמר בהצלחה!</h2>
            <p className="text-green-600 mb-6">{parsed.filter(o => o.approved).length} הזמנות יובאו למערכת</p>
            <div className="flex gap-3 justify-center">
              <a href="/orders" className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm">צפה בהזמנות</a>
              <button onClick={() => { setParsed([]); setText(''); setSaved(false) }}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm">
                ייבוא נוסף
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">נמצאו {parsed.length} הזמנות — בדוק ואשר</h2>
              <button onClick={() => setParsed([])} className="text-sm text-gray-500">← חזור</button>
            </div>

            <div className="space-y-4 mb-6">
              {parsed.map((o, i) => (
                <div key={i} className={`bg-white rounded-xl border p-4 ${!o.approved ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input type="checkbox" checked={o.approved}
                        onChange={e => {
                          const updated = [...parsed]
                          updated[i].approved = e.target.checked
                          setParsed(updated)
                        }}
                        className="w-4 h-4" />
                      <span className="font-bold">{o.name}</span>
                      {o.order_number && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          #{o.order_number}
                        </span>
                      )}
                      {o.size && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          מידה {o.size}
                        </span>
                      )}
                      {o.color && (
                        <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                          {o.color}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{o.phone}</span>
                  </div>

                  <input placeholder="שם המוצר *" value={o.product}
                    onChange={e => {
                      const updated = [...parsed]
                      updated[i].product = e.target.value
                      setParsed(updated)
                    }}
                    className="w-full border border-yellow-400 bg-yellow-50 rounded-lg px-3 py-2 text-sm mb-2" />

                  <p className="text-xs text-gray-400">📍 {o.address} {o.city} {o.zip}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50">
              {loading ? 'שומר...' : `✅ שמור ${parsed.filter(o => o.approved).length} הזמנות למערכת`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
