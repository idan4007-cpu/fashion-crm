'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

type ParsedOrder = {
  order_number: string
  product: string
  size: string
  name: string
  address: string
  phone: string
  tracking: string
  payment: string
  price: number
  cost: number
  order_date: string
  approved: boolean
}

function parseDate(raw: any): string {
  if (!raw) return ''
  try {
    const str = String(raw).trim()
    // פורמט DD.MM.YY או DD.MM.YYYY
    const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
    if (dotMatch) {
      let year = parseInt(dotMatch[3])
      if (year < 100) year += 2000
      const month = parseInt(dotMatch[2]) - 1
      const day = parseInt(dotMatch[1])
      const d = new Date(year, month, day)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    }
    // תאריך רגיל
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch { }
  return ''
}

export default function ImportPage() {
  const [parsed, setParsed] = useState<ParsedOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveStats, setSaveStats] = useState({ added: 0, skipped: 0 })
  const [tab, setTab] = useState<'excel' | 'whatsapp'>('excel')
  const [text, setText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      const wb = XLSX.read(data, { type: 'binary', cellDates: true })
      const allOrders: ParsedOrder[] = []

      const monthSheets = wb.SheetNames.filter(name =>
        !name.includes('סיכום') && !name.includes('קבלות') && !name.includes('גיליון')
      )

      for (const sheetName of monthSheets) {
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]

        let startRow = 2
        for (let r = 0; r < Math.min(5, rows.length); r++) {
          const cell = String(rows[r][1] || '')
          if (cell.includes('מס') || cell.includes('הזמנה')) {
            startRow = r + 1
            break
          }
        }

        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i]
          if (!row[1] || !row[4]) continue

          allOrders.push({
            order_number: String(row[1] || ''),
            product: String(row[2] || ''),
            size: String(row[3] || ''),
            name: String(row[4] || ''),
            address: String(row[5] || ''),
            phone: String(row[6] || ''),
            tracking: String(row[7] || ''),
            payment: String(row[8] || ''),
            price: parseFloat(row[10]) || 0,
            cost: parseFloat(row[11]) || 0,
            order_date: parseDate(row[0]),
            approved: true
          })
        }
      }
      setParsed(allOrders)
    }
    reader.readAsBinaryString(file)
  }

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
      setParsed(data.orders.map((o: any) => ({ ...o, approved: true, price: 0, cost: 0, tracking: '', payment: '', order_date: '' })))
    } catch {
      alert('שגיאה בניתוח')
    }
    setAnalyzing(false)
  }

  async function handleSave() {
    setLoading(true)
    const approved = parsed.filter(o => o.approved)
    let added = 0
    let skipped = 0

    for (const order of approved) {
      if (order.order_number) {
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', order.order_number)
          .single()
        if (existing) { skipped++; continue }
      }

      let customerId = ''
      const phone = order.phone?.toString().replace(/\D/g, '') || ''
      if (phone) {
        const { data: existingCustomer } = await supabase
          .from('customers').select('id').eq('phone', phone).single()
        if (existingCustomer) {
          customerId = existingCustomer.id
        } else {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert([{ name: order.name, phone, city: order.address, type: 'new' }])
            .select().single()
          if (newCustomer) customerId = newCustomer.id
        }
      }

      if (customerId) {
        const { error } = await supabase.from('orders').insert([{
          customer_id: customerId,
          product: order.product || 'לא צוין',
          size: order.size || '',
          status: 'new',
          price: order.price || 0,
          cost_price: order.cost || 0,
          quantity: 1,
          order_date: order.order_date || null,
          payment_method: order.payment || null
        }])
        if (!error) added++
      }
    }

    setSaveStats({ added, skipped })
    setLoading(false)
    setSaved(true)
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📥 ייבוא הזמנות</h1>
            <p className="text-gray-500 text-sm">ייבוא מ-Excel או מוואטסאפ</p>
          </div>
          <a href="/" className="text-sm text-gray-500 px-3 py-2">🏠 דשבורד</a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('excel')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'excel' ? 'bg-green-600 text-white' : 'bg-white border text-gray-600'}`}>
            📊 ייבוא מ-Excel
          </button>
          <button onClick={() => setTab('whatsapp')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'whatsapp' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>
            📱 ייבוא מוואטסאפ
          </button>
        </div>

        {!parsed.length ? (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            {tab === 'excel' ? (
              <>
                <h2 className="text-lg font-bold mb-2">העלה קובץ Excel</h2>
                <p className="text-sm text-gray-500 mb-4">
                  המערכת תקרא את כל הכרטיסיות ותדלג על הזמנות כפולות אוטומטית ✅
                </p>
                <input type="file" accept=".xlsx,.xls" onChange={handleExcel}
                  className="block w-full text-sm text-gray-500 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700" />
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold mb-2">הדבק טקסט מהקבוצה</h2>
                <textarea value={text} onChange={e => setText(e.target.value)}
                  placeholder="הדבק כאן את הטקסט..."
                  className="w-full border rounded-lg p-3 text-sm h-48 font-mono" dir="ltr" />
                <button onClick={handleAnalyze} disabled={!text.trim() || analyzing}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {analyzing ? '🤖 מנתח...' : '🤖 נתח עם AI'}
                </button>
              </>
            )}
          </div>
        ) : saved ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <p className="text-4xl mb-4">🎉</p>
            <h2 className="text-xl font-bold text-green-800 mb-2">הייבוא הושלם!</h2>
            <div className="flex justify-center gap-6 mb-6">
              <div>
                <p className="text-3xl font-bold text-green-600">{saveStats.added}</p>
                <p className="text-sm text-gray-500">הזמנות חדשות</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-400">{saveStats.skipped}</p>
                <p className="text-sm text-gray-500">דולגו (כפולות)</p>
              </div>
            </div>
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
              <h2 className="text-lg font-bold">נמצאו {parsed.length} הזמנות</h2>
              <button onClick={() => setParsed([])} className="text-sm text-gray-500">← חזור</button>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right">✓</th>
                      <th className="px-3 py-2 text-right">תאריך</th>
                      <th className="px-3 py-2 text-right">מס'</th>
                      <th className="px-3 py-2 text-right">שם</th>
                      <th className="px-3 py-2 text-right">מוצר</th>
                      <th className="px-3 py-2 text-right">תשלום</th>
                      <th className="px-3 py-2 text-right">מחיר</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((o, i) => (
                      <tr key={i} className={`border-t ${!o.approved ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={o.approved}
                            onChange={e => {
                              const updated = [...parsed]
                              updated[i].approved = e.target.checked
                              setParsed(updated)
                            }} />
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{o.order_date}</td>
                        <td className="px-3 py-2">#{o.order_number}</td>
                        <td className="px-3 py-2">{o.name}</td>
                        <td className="px-3 py-2">{o.product}</td>
                        <td className="px-3 py-2 text-xs">{o.payment}</td>
                        <td className="px-3 py-2">₪{o.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <button onClick={handleSave} disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50">
              {loading ? 'שומר...' : `✅ שמור ${parsed.filter(o => o.approved).length} הזמנות למערכת`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
