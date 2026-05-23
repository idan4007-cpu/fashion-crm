'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, ShoppingBag } from 'lucide-react'

type Order = {
  id: string
  order_number: number
  customer_id: string
  product: string
  category: string
  size: string
  color: string
  quantity: number
  price: number
  cost_price: number
  status: string
  created_at: string
  customers?: { name: string; phone: string }
}

type Customer = {
  id: string
  name: string
  phone: string
}

const statusOptions = [
  { value: 'new', label: 'חדש', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending_payment', label: 'ממתין לתשלום', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'paid', label: 'שולם', color: 'bg-green-100 text-green-700' },
  { value: 'preparing', label: 'בהכנה', color: 'bg-blue-100 text-blue-700' },
  { value: 'shipped', label: 'נשלח', color: 'bg-purple-100 text-purple-700' },
  { value: 'completed', label: 'הושלם', color: 'bg-emerald-100 text-emerald-700' },
]

const categoryOptions = [
  { value: 'shoes', label: 'נעליים' },
  { value: 'bags', label: 'תיקים' },
  { value: 'belts', label: 'חגורות' },
  { value: 'jewelry', label: 'תכשיטים' },
  { value: 'clothing', label: 'ביגוד' },
]

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    customer_id: '',
    product: '',
    category: 'shoes',
    size: '',
    color: '',
    quantity: 1,
    price: '',
    cost_price: '',
    status: 'new'
  })

  useEffect(() => {
    fetchOrders()
    fetchCustomers()
  }, [])

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id, name, phone')
    setCustomers(data || [])
  }

  async function addOrder() {
    if (!form.customer_id) return alert('יש לבחור לקוחה')
    if (!form.product) return alert('יש להזין מוצר')
    const { error } = await supabase.from('orders').insert([{
      ...form,
      price: parseFloat(form.price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      quantity: parseInt(String(form.quantity)) || 1
    }])
    if (!error) {
      setForm({ customer_id: '', product: '', category: 'shoes', size: '', color: '', quantity: 1, price: '', cost_price: '', status: 'new' })
      setShowForm(false)
      fetchOrders()
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id)
    fetchOrders()
  }

  const filtered = orders.filter(o => {
    const matchSearch =
      o.customers?.name?.includes(search) ||
      o.product?.includes(search) ||
      String(o.order_number)?.includes(search)
    const matchStatus = filterStatus ? o.status === filterStatus : true
    return matchSearch && matchStatus
  })

  const getStatus = (val: string) => statusOptions.find(s => s.value === val) || statusOptions[0]

  // חישוב נכון: מע"מ ורווח רק על ההפרש בין מכירה לעלות
  const calcVat = (price: number, cost: number) => ((price - cost) * 0.18).toFixed(2)
  const calcProfit = (price: number, cost: number) => ((price - cost) * 0.82).toFixed(2)

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">🛍 הזמנות</h1>
            <p className="text-gray-500 text-sm">{orders.length} הזמנות במערכת</p>
          </div>
          <div className="flex gap-2">
            <a href="/" className="text-sm text-gray-500 px-3 py-2">🏠 דשבורד</a>
            <button onClick={() => setShowForm(!showForm)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
              <Plus size={16} /> הזמנה חדשה
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">הוספת הזמנה חדשה</h2>
            <div className="grid grid-cols-2 gap-4">
              <select value={form.customer_id}
                onChange={e => setForm({...form, customer_id: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm col-span-2">
                <option value="">בחר לקוחה *</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>

              <input placeholder="מוצר *" value={form.product}
                onChange={e => setForm({...form, product: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm col-span-2" />

              <select value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm">
                {categoryOptions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              <input placeholder="מידה" value={form.size}
                onChange={e => setForm({...form, size: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />

              <input placeholder="צבע" value={form.color}
                onChange={e => setForm({...form, color: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />

              <input placeholder="כמות" type="number" value={form.quantity}
                onChange={e => setForm({...form, quantity: parseInt(e.target.value)})}
                className="border rounded-lg px-3 py-2 text-sm" />

              <input placeholder="מחיר מכירה ללקוח ₪" type="number" value={form.price}
                onChange={e => setForm({...form, price: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />

              <input placeholder="מחיר עלות שלנו ₪" type="number" value={form.cost_price}
                onChange={e => setForm({...form, cost_price: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />

              <select value={form.status}
                onChange={e => setForm({...form, status: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm col-span-2">
                {statusOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={addOrder}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium">
                שמור הזמנה
              </button>
              <button onClick={() => setShowForm(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm">
                ביטול
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            <input placeholder="חיפוש לפי שם, מוצר או מספר הזמנה..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border rounded-lg pr-10 pl-4 py-2 text-sm bg-white" />
          </div>
          <select value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">כל הסטטוסים</option>
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">טוען...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">אין הזמנות עדיין</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(o => {
              const s = getStatus(o.status)
              return (
                <div key={o.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <ShoppingBag className="text-purple-600" size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">#{o.order_number} — {o.customers?.name}</p>
                        <p className="text-sm text-gray-600">{o.product} {o.size && `| מידה ${o.size}`} {o.color && `| ${o.color}`}</p>
                        <p className="text-sm text-gray-500">{o.customers?.phone}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-800">₪{o.price}</p>
                      {o.cost_price > 0 && (
                        <div className="text-xs mt-1 space-y-0.5">
                          <p className="text-gray-400">עלות: ₪{o.cost_price}</p>
                          <p className="text-orange-500">מע"מ על רווח: ₪{calcVat(o.price, o.cost_price)}</p>
                          <p className="text-green-600 font-medium">רווח נטו: ₪{calcProfit(o.price, o.cost_price)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                    <select value={o.status}
                      onChange={e => updateStatus(o.id, e.target.value)}
                      className="text-xs border rounded-lg px-2 py-1 bg-white">
                      {statusOptions.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
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
