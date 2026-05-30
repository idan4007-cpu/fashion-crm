'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, User, Phone, AtSign, MapPin } from 'lucide-react'

type Customer = {
  id: string
  name: string
  phone: string
  instagram: string
  city: string
  notes: string
  type: 'new' | 'returning' | 'vip'
  created_at: string
  order_count?: number
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', phone: '', instagram: '', city: '', notes: '', type: 'new'
  })

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    // מביא את כל הלקוחות עם pagination
    let allCustomers: Customer[] = []
    let from = 0
    const batchSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .range(from, from + batchSize - 1)

      if (error || !data || data.length === 0) break
      allCustomers = [...allCustomers, ...data]
      if (data.length < batchSize) break
      from += batchSize
    }

    // מביא את כל ההזמנות לספירה
    let allOrders: { customer_id: string }[] = []
    let ordersFrom = 0

    while (true) {
      const { data, error } = await supabase
        .from('orders')
        .select('customer_id')
        .range(ordersFrom, ordersFrom + batchSize - 1)

      if (error || !data || data.length === 0) break
      allOrders = [...allOrders, ...data]
      if (data.length < batchSize) break
      ordersFrom += batchSize
    }

    // סופר הזמנות לכל לקוח
    const orderCount: Record<string, number> = {}
    for (const o of allOrders) {
      if (o.customer_id) {
        orderCount[o.customer_id] = (orderCount[o.customer_id] || 0) + 1
      }
    }

    // ממיין לפי כמות הזמנות מהגבוה לנמוך
    const sorted = allCustomers
      .map(c => ({ ...c, order_count: orderCount[c.id] || 0 }))
      .sort((a, b) => b.order_count - a.order_count)

    setCustomers(sorted)
    setLoading(false)
  }

  async function addCustomer() {
    if (!form.name) return alert('שם לקוחה הוא שדה חובה')
    const { error } = await supabase.from('customers').insert([form])
    if (!error) {
      setForm({ name: '', phone: '', instagram: '', city: '', notes: '', type: 'new' })
      setShowForm(false)
      fetchCustomers()
    }
  }

  const filtered = customers.filter(c =>
    c.name?.includes(search) ||
    c.phone?.includes(search) ||
    c.city?.includes(search)
  )

  const typeLabel = (type: string) => {
    if (type === 'vip') return { label: 'VIP', color: 'bg-yellow-100 text-yellow-800' }
    if (type === 'returning') return { label: 'חוזרת', color: 'bg-green-100 text-green-800' }
    return { label: 'חדשה', color: 'bg-blue-100 text-blue-800' }
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">👥 לקוחות</h1>
            <p className="text-gray-500 text-sm">{customers.length} לקוחות במערכת</p>
          </div>
          <div className="flex gap-2">
            <a href="/" className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">🏠 דשבורד</a>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={16} /> לקוחה חדשה
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">הוספת לקוחה חדשה</h2>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="שם מלא *" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm col-span-2" />
              <input placeholder="טלפון" value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="אינסטגרם" value={form.instagram}
                onChange={e => setForm({...form, instagram: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="עיר" value={form.city}
                onChange={e => setForm({...form, city: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />
              <select value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="new">חדשה</option>
                <option value="returning">חוזרת</option>
                <option value="vip">VIP</option>
              </select>
              <textarea placeholder="הערות" value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm col-span-2" rows={2} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={addCustomer}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium">
                שמור לקוחה
              </button>
              <button onClick={() => setShowForm(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm">
                ביטול
              </button>
            </div>
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          <input
            placeholder="חיפוש לפי שם, טלפון או עיר..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-lg pr-10 pl-4 py-2 text-sm bg-white"
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">⏳ טוען את כל הלקוחות...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">אין לקוחות עדיין</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const t = typeLabel(c.type)
              return (
                <div key={c.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <User className="text-blue-600" size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{c.name}</p>
                        <div className="flex gap-3 mt-1">
                          {c.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone size={12} />{c.phone}</span>}
                          {c.city && <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={12} />{c.city}</span>}
                          {c.instagram && <span className="flex items-center gap-1 text-xs text-gray-500"><AtSign size={12} />{c.instagram}</span>}
                        </div>
                        {c.notes && <p className="text-xs text-gray-400 mt-1">{c.notes}</p>}
                        {c.order_count !== undefined && c.order_count > 0 && (
                          <p className="text-xs font-bold text-purple-600 mt-1">🛍️ {c.order_count} הזמנות</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.color}`}>{t.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}