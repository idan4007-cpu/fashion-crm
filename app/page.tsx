'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingBag, Users, Clock, TrendingUp, Package, CreditCard, BarChart2, Bell } from 'lucide-react'

type PaymentStat = {
  method: string
  count: number
  total: number
}

type MonthStat = {
  month: string
  revenue: number
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingPayment: 0,
    shipped: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    totalOrders: 0,
    dormantYear: 0,
    dormant6to12: 0
  })
  const [payments, setPayments] = useState<PaymentStat[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthStat[]>([])

  useEffect(() => {
    fetchStats()
    fetchCharts()
    fetchDormant()
  }, [])

  async function fetchStats() {
    const today = new Date().toISOString().split('T')[0]
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const { data: todayOrders } = await supabase.from('orders').select('id').gte('created_at', today)
    const { data: pending } = await supabase.from('orders').select('id').eq('status', 'pending_payment')
    const { data: shipped } = await supabase.from('orders').select('id').eq('status', 'shipped')
    const { data: revenue } = await supabase.from('payments').select('amount').gte('paid_at', firstOfMonth)
    const { count: totalOrders } = await supabase.from('orders').select('id', { count: 'exact', head: true })
    const { count: totalCustomers } = await supabase.from('customers').select('id', { count: 'exact', head: true })

    setStats(prev => ({
      ...prev,
      todayOrders: todayOrders?.length || 0,
      pendingPayment: pending?.length || 0,
      shipped: shipped?.length || 0,
      monthlyRevenue: revenue?.reduce((s, p) => s + (p.amount || 0), 0) || 0,
      totalCustomers: totalCustomers || 0,
      totalOrders: totalOrders || 0
    }))
  }

  async function fetchDormant() {
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_id, order_date')
      .not('order_date', 'is', null)
      .limit(10000)

    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .limit(5000)

    if (!orders || !customers) return

    const today = new Date()
    let dormantYear = 0
    let dormant6to12 = 0

    for (const c of customers) {
      const customerOrders = orders.filter(o => o.customer_id === c.id)
      if (customerOrders.length === 0) continue

      const dates = customerOrders
        .map(o => new Date(o.order_date))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())

      if (dates.length === 0) continue

      const daysDiff = Math.floor((today.getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > 365) dormantYear++
      else if (daysDiff > 180) dormant6to12++
    }

    setStats(prev => ({ ...prev, dormantYear, dormant6to12 }))
  }

  async function fetchCharts() {
    const { data: orders } = await supabase
      .from('orders')
      .select('payment_method, price')
      .not('payment_method', 'is', null)

    if (orders) {
      const map: Record<string, { count: number, total: number }> = {}
      for (const o of orders) {
        const m = o.payment_method || 'אחר'
        if (!map[m]) map[m] = { count: 0, total: 0 }
        map[m].count++
        map[m].total += o.price || 0
      }
      setPayments(Object.entries(map).map(([method, d]) => ({ method, ...d })).sort((a, b) => b.count - a.count))
    }

    const { data: monthly } = await supabase
      .from('orders')
      .select('order_date, price')
      .not('order_date', 'is', null)
      .gte('order_date', new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0])

    if (monthly) {
      const months: Record<string, number> = {}
      const monthNames = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']
      for (const o of monthly) {
        const d = new Date(o.order_date)
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`
        months[key] = (months[key] || 0) + (o.price || 0)
      }
      setMonthlyStats(Object.entries(months).map(([month, revenue]) => ({ month, revenue })).slice(-12))
    }
  }

  const totalPayments = payments.reduce((s, p) => s + p.count, 0)
  const maxRevenue = Math.max(...monthlyStats.map(m => m.revenue), 1)

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">👗 Fashion CRM</h1>
          <p className="text-gray-500 text-sm">ברוך הבא, עידן</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg"><ShoppingBag className="text-blue-600" size={20} /></div>
              <span className="text-gray-600 text-sm">הזמנות היום</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.todayOrders}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 p-2 rounded-lg"><Clock className="text-yellow-600" size={20} /></div>
              <span className="text-gray-600 text-sm">ממתין לתשלום</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.pendingPayment}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-pink-100 p-2 rounded-lg"><Users className="text-pink-600" size={20} /></div>
              <span className="text-gray-600 text-sm">סה"כ לקוחות</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalCustomers}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-100 p-2 rounded-lg"><CreditCard className="text-emerald-600" size={20} /></div>
              <span className="text-gray-600 text-sm">סה"כ הזמנות</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalOrders}</p>
          </div>
        </div>

        {/* לקוחות רדומים */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <a href="/dormant" className="bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100 transition">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 p-2 rounded-lg"><Bell className="text-red-500" size={20} /></div>
              <span className="text-red-700 text-sm font-medium">רדום מעל שנה</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.dormantYear}</p>
            <p className="text-xs text-red-400 mt-1">לקוחות לעיר ← לחץ לפרטים</p>
          </a>
          <a href="/dormant" className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 hover:bg-yellow-100 transition">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 p-2 rounded-lg"><Bell className="text-yellow-500" size={20} /></div>
              <span className="text-yellow-700 text-sm font-medium">רדום 6-12 חודשים</span>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.dormant6to12}</p>
            <p className="text-xs text-yellow-400 mt-1">כדאי ליצור קשר ← לחץ לפרטים</p>
          </a>
        </div>

        {/* גרפים */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="text-lg font-bold mb-4">💳 פילוח אמצעי תשלום</h2>
            {payments.length > 0 ? (
              <div>
                <div className="flex justify-center mb-4">
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {(() => {
                        let offset = 0
                        return payments.slice(0, 6).map((p, i) => {
                          const pct = (p.count / totalPayments) * 100
                          const dash = `${pct} ${100 - pct}`
                          const el = (
                            <circle key={p.method} cx="50" cy="50" r="15.9"
                              fill="none" stroke={COLORS[i % COLORS.length]}
                              strokeWidth="31.8" strokeDasharray={dash}
                              strokeDashoffset={-offset} />
                          )
                          offset += pct
                          return el
                        })
                      })()}
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  {payments.slice(0, 6).map((p, i) => (
                    <div key={p.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-700">{p.method}</span>
                        <span className="text-gray-400 text-xs">({p.count})</span>
                      </div>
                      <span className="font-medium">₪{Math.round(p.total).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">אין נתונים עדיין</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="text-lg font-bold mb-4">📈 הכנסות 12 חודשים אחרונים</h2>
            {monthlyStats.length > 0 ? (
              <div className="flex items-end gap-1 h-40">
                {monthlyStats.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-purple-500 rounded-t-sm"
                      style={{ height: `${(m.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}
                      title={`₪${Math.round(m.revenue).toLocaleString()}`} />
                    <span className="text-xs text-gray-400 rotate-45 origin-left" style={{ fontSize: '9px' }}>{m.month}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">אין נתונים עדיין</p>
            )}
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-700 mb-4">פעולות מהירות</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          <a href="/customers" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-blue-50 transition">
            <Users className="mx-auto mb-2 text-blue-600" size={24} />
            <p className="font-medium text-gray-700 text-sm">לקוחות</p>
          </a>
          <a href="/orders" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-purple-50 transition">
            <ShoppingBag className="mx-auto mb-2 text-purple-600" size={24} />
            <p className="font-medium text-gray-700 text-sm">הזמנות</p>
          </a>
          <a href="/payments" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-green-50 transition">
            <CreditCard className="mx-auto mb-2 text-green-600" size={24} />
            <p className="font-medium text-gray-700 text-sm">תשלומים</p>
          </a>
          <a href="/shipments" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-orange-50 transition">
            <Package className="mx-auto mb-2 text-orange-500" size={24} />
            <p className="font-medium text-gray-700 text-sm">משלוחים</p>
          </a>
          <a href="/analytics" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-indigo-50 transition">
            <BarChart2 className="mx-auto mb-2 text-indigo-600" size={24} />
            <p className="font-medium text-gray-700 text-sm">אנליטיקה</p>
          </a>
          <a href="/dormant" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-red-50 transition">
            <Bell className="mx-auto mb-2 text-red-500" size={24} />
            <p className="font-medium text-gray-700 text-sm">רדומים</p>
          </a>
          <a href="/import" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-orange-50 transition">
            <Package className="mx-auto mb-2 text-orange-600" size={24} />
            <p className="font-medium text-gray-700 text-sm">ייבוא</p>
          </a>
        </div>
      </div>
    </div>
  )
}
