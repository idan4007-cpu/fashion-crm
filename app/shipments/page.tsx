'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, Plus, Truck } from 'lucide-react'

type Shipment = {
  id: string
  order_id: string
  address: string
  tracking_number: string
  courier: string
  status: string
  updated_at: string
  orders?: {
    order_number: number
    product: string
    customers?: { name: string; phone: string }
  }
}

type Order = {
  id: string
  order_number: number
  product: string
  customers?: { name: string }
}

const statusOptions = [
  { value: 'pending', label: 'ממתין לשליחה', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'in_transit', label: 'בדרך', color: 'bg-blue-100 text-blue-700' },
  { value: 'delivered', label: 'נמסר', color: 'bg-green-100 text-green-700' },
]

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    order_id: '',
    address: '',
    tracking_number: '',
    courier: '',
    status: 'pending'
  })

  useEffect(() => {
    fetchShipments()
    fetchOrders()
  }, [])

  async function fetchShipments() {
    const { data } = await supabase
      .from('shipments')
      .select('*, orders(order_number, product, customers(name, phone))')
      .order('updated_at', { ascending: false })
    setShipments(data || [])
    setLoading(false)
  }

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, product, customers(name)')
      .eq('status', 'paid')
    setOrders(data || [])
  }

  async function addShipment() {
    if (!form.order_id) return alert('יש לבחור הזמנה')
    if (!form.address) return alert('יש להזין כתובת')
    const { error } = await supabase.from('shipments').insert([form])
    if (!error) {
      await supabase.from('orders').update({ status: 'shipped' }).eq('id', form.order_id)
      setForm({ order_id: '', address: '', tracking_number: '', courier: '', status: 'pending' })
      setShowForm(false)
      fetchShipments()
      fetchOrders()
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('shipments').update({ status }).eq('id', id)
    fetchShipments()
  }

  const getStatus = (val: string) => statusOptions.find(s => s.value === val) || statusOptions[0]

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">🚚 משלוחים</h1>
            <p className="text-gray-500 text-sm">{shipments.length} משלוחים במערכת</p>
          </div>
          <div className="flex gap-2">
            <a href="/" className="text-sm text-gray-500 px-3 py-2">🏠 דשבורד</a>
            <button onClick={() => setShowForm(!showForm)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
              <Plus size={16} /> משלוח חדש
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">הוספת משלוח חדש</h2>
            <div className="grid grid-cols-2 gap-4">
              <select value={form.order_id}
                onChange={e => setForm({...form, order_id: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm col-span-2">
                <option value="">בחר הזמנה ששולמה *</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>#{o.order_number} — {o.customers?.name} — {o.product}</option>
                ))}
              </select>

              <input placeholder="כתובת מלאה *" value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm col-span-2" />

              <input placeholder="מספר מעקב" value={form.tracking_number}
                onChange={e => setForm({...form, tracking_number: e.target.value})}
                className="border rounded-lg px-3 py-2 text-sm" />

              <input placeholder="חברת משלוחים" value={form.courier}
                onChange={e => setForm({...form, courier: e.target.value})}
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
              <button onClick={addShipment}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg text-sm font-medium">
                שמור משלוח
              </button>
              <button onClick={() => setShowForm(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm">
                ביטול
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500 py-8">טוען...</p>
        ) : shipments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">אין משלוחים עדיין</p>
        ) : (
          <div className="space-y-3">
            {shipments.map(s => {
              const st = getStatus(s.status)
              return (
                <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 p-2 rounded-full">
                        <Truck className="text-orange-500" size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">
                          #{s.orders?.order_number} — {s.orders?.customers?.name}
                        </p>
                        <p className="text-sm text-gray-600">{s.orders?.product}</p>
                        <p className="text-sm text-gray-500">{s.address}</p>
                        {s.tracking_number && (
                          <p className="text-xs text-blue-600 mt-1">
                            🔍 מספר מעקב: {s.tracking_number} {s.courier && `| ${s.courier}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex justify-end mt-2">
                    <select value={s.status}
                      onChange={e => updateStatus(s.id, e.target.value)}
                      className="text-xs border rounded-lg px-2 py-1 bg-white">
                      {statusOptions.map(st => (
                        <option key={st.value} value={st.value}>{st.label}</option>
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
