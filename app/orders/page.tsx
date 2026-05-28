'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, ShoppingBag, Trash2, Pencil, X, Check } from 'lucide-react'

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
  order_date: string
  payment_method: string
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

const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Order>>({})
  const [form, setForm] = useState({
    customer_id: '',
    product: '',
    category: 'shoes',
    size: '',
    color: '',
    quantity: 1,
    price: '',
    cost_price: '',
    status: 'new',
    payment_method: '',
    order_date: ''
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
      .limit(5000)
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
      quantity: parseInt(String(form.quantity)) || 1,
      order_date: form.order_date || null,
      payment_method: form.payment_method || null
    }])
    if (!error) {
      setForm({ customer_id: '', product: '', category: 'shoes', size: '', color: '', quantity: 1, price: '', cost_price: '', status: 'new', payment_method: '', order_date: '' })
      setShowForm(false)
      fetchOrders()
    }
  }

  async function deleteOrder(id: string) {
    if (!confirm('למחוק את ההזמנה?')) return
    await supabase.from('orders').delete().eq('id', id)
    fetchOrders()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id)
    fetchOrders()
  }

  function startEdit(o: Order) {
    setEditingId(o.id)
    setEditForm({
      product: o.product,
      size: o.size,
      color: o.color,
      price: o.price,
      cost_price: o.cost_price,
      payment_method: o.payment_method,
      order_date: o.order_date,
      status: o.status
    })
  }

  async function saveEdit(id: string) {
    await supabase.from('orders').update(editForm).eq('id', id)
    setEditingId(null)
    fetchOrders()
  }

  const availableYears = [...new Set(orders
    .filter(o => o.order_date)
    .map(o => new Date(o.order_date).getFullYear().toString())
  )].sort((a, b) => Number(b) - Number(a))

  const filtered = orders.filter(o => {
    const matchSearch =
      o.customers?.name?.includes(search) ||
      o.product?.includes(search) ||
      String(o.order_number)?.includes(search)
    const matchStatus = filterStatus ? o.status === filterStatus : true
    const matchYear = filterYear
      ? o.order_date && new Date(o.order_date).getFullYear().toString() === filterYear
      : true
    const matchMonth = filterMonth
      ? o.order_date && new Date(o.order_date).getMonth().toString() === filterMonth
      : true
    return matchSearch && matchStatus && matchYear && matchMonth
  })

  const totalRevenue = filtered.reduce((s, o) => s + (o.price || 0), 0)
  const totalProfit = filtered.reduce((s, o) => s + ((o.price - o.cost_price) * 0.82 || 0), 0)
  const totalVat = filtered.reduce((s, o) => s + ((o.price - o.cost_price) * 0.18 || 0), 0)

  const getStatus = (val: string) => statusOptions.find(s => s.value === val) || statusOptions[0]
  const calcVat = (price: number, cost: number) => ((price - cost) * 0.18).toFixed(2)
  const calcProfit = (price: number, cost: number) => ((price - cost) * 0.82).toFixed(2)
  const fmt = (n: number) => `₪${Math.round(n).toLocaleString()}`

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">🛍️ הזמנות</h1>
            <p className="text-gray-500 text-sm">{filtered.length} מתוך {orders.length} הזמנות</p>
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
              <input placeholder="מחיר מכירה ₪" type="number" value={form.price}
                onChange={e => setForm({...form, price: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="מחיר עלות ₪" type="number" value={form.cost_price}
                onChange={e => setForm({...form, cost_price: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="תאריך הזמנה" type="date" value={form.order_date}
                onChange={e => setForm({...form, order_date: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="אמצעי תשלום" value={form.payment_method}
                onChange={e => setForm({...form, payment_method: e.target.value})}
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

        {/* פילטרים */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="relative col-span-2">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            <input placeholder="חיפוש לפי שם, מוצר או מספר הזמנה..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border rounded-lg pr-10 pl-4 py-2 text-sm bg-white" />
          </div>
          <select value={filterYear}
            onChange={e => { setFilterYear(e.target.value); setFilterMonth('') }}
            className="border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">כל השנים</option>
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            disabled={!filterYear}>
            <option value="">כל החודשים</option>
            {monthNames.map((m, i) => (
              <option key={i} value={String(i)}>{m}</option>
            ))}
          </select>
          <select value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">כל הסטטוסים</option>
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(filterYear || filterMonth || filterStatus || search) && (
            <button onClick={() => { setFilterYear(''); setFilterMonth(''); setFilterStatus(''); setSearch('') }}
              className="border rounded-lg px-3 py-2 text-sm bg-white text-red-500">
              ✕ נקה פילטרים
            </button>
          )}
        </div>

        {/* סיכום תקופה */}
        {(filterYear || filterMonth) && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-purple-800 mb-3">
              סיכום — {filterMonth !== '' ? monthNames[Number(filterMonth)] + ' ' : ''}{filterYear}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">הזמנות</p>
                <p className="text-xl font-bold text-gray-800">{filtered.length}</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">הכנסות</p>
                <p className="text-xl font-bold text-gray-800">{fmt(totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">רווח נטו</p>
                <p className="text-xl font-bold text-green-600">{fmt(totalProfit)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">מע"מ</p>
                <p className="text-xl font-bold text-orange-500">{fmt(totalVat)}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500 py-8">טוען...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">אין הזמנות</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(o => {
              const s = getStatus(o.status)
              const isEditing = editingId === o.id

              return (
                <div key={o.id} className="bg-white rounded-xl shadow-sm border p-4">
                  {isEditing ? (
                    // מצב עריכה
                    <div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input placeholder="מוצר" value={editForm.product || ''}
                          onChange={e => setEditForm({...editForm, product: e.target.value})}
                          className="border rounded-lg px-3 py-2 text-sm col-span-2" />
                        <input placeholder="מידה" value={editForm.size || ''}
                          onChange={e => setEditForm({...editForm, size: e.target.value})}
                          className="border rounded-lg px-3 py-2 text-sm" />
                        <input placeholder="צבע" value={editForm.color || ''}
                          onChange={e => setEditForm({...editForm, color: e.target.value})}
                          className="border rounded-lg px-3 py-2 text-sm" />
                        <input placeholder="מחיר מכירה" type="number" value={editForm.price || ''}
                          onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value)})}
                          className="border rounded-lg px-3 py-2 text-sm" />
                        <input placeholder="מחיר עלות" type="number" value={editForm.cost_price || ''}
                          onChange={e => setEditForm({...editForm, cost_price: parseFloat(e.target.value)})}
                          className="border rounded-lg px-3 py-2 text-sm" />
                        <input placeholder="אמצעי תשלום" value={editForm.payment_method || ''}
                          onChange={e => setEditForm({...editForm, payment_method: e.target.value})}
                          className="border rounded-lg px-3 py-2 text-sm" />
                        <input type="date" value={editForm.order_date || ''}
                          onChange={e => setEditForm({...editForm, order_date: e.target.value})}
                          className="border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(o.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1">
                          <Check size={14} /> שמור
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-1">
                          <X size={14} /> ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    // תצוגה רגילה
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-full">
                            <ShoppingBag className="text-purple-600" size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">#{o.order_number} — {o.customers?.name}</p>
                            <p className="text-sm text-gray-600">{o.product} {o.size && `| מידה ${o.size}`} {o.color && `| ${o.color}`}</p>
                            <p className="text-sm text-gray-500">{o.customers?.phone}</p>
                            {o.order_date && <p className="text-xs text-gray-400">📅 {new Date(o.order_date).toLocaleDateString('he-IL')}</p>}
                            {o.payment_method && <p className="text-xs text-gray-400">💳 {o.payment_method}</p>}
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-800">₪{o.price}</p>
                          {o.cost_price > 0 && (
                            <div className="text-xs mt-1 space-y-0.5">
                              <p className="text-gray-400">עלות: ₪{o.cost_price}</p>
                              <p className="text-orange-500">מע"מ: ₪{calcVat(o.price, o.cost_price)}</p>
                              <p className="text-green-600 font-medium">רווח: ₪{calcProfit(o.price, o.cost_price)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                        <div className="flex items-center gap-2">
                          <select value={o.status}
                            onChange={e => updateStatus(o.id, e.target.value)}
                            className="text-xs border rounded-lg px-2 py-1 bg-white">
                            {statusOptions.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <button onClick={() => startEdit(o)}
                            className="text-blue-400 hover:text-blue-600 p-1">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => deleteOrder(o.id)}
                            className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}