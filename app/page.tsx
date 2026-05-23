'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingBag, Users, Clock, TrendingUp, Package, CreditCard } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingPayment: 0,
    shipped: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    totalOrders: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    const today = new Date().toISOString().split('T')[0]
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const { data: todayOrders } = await supabase
      .from('orders')
      .select('id')
      .gte('created_at', today)

    const { data: pending } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'pending_payment')

    const { data: shipped } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'shipped')

    const { data: revenue } = await supabase
      .from('payments')
      .select('amount')
      .gte('paid_at', firstOfMonth)

    const { count: totalOrders } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })

    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })

    const totalRevenue = revenue?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    setStats({
      todayOrders: todayOrders?.length || 0,
      pendingPayment: pending?.length || 0,
      shipped: shipped?.length || 0,
      monthlyRevenue: totalRevenue,
      totalCustomers: totalCustomers || 0,
      totalOrders: totalOrders || 0
    })
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">👗 Fashion CRM</h1>
          <p className="text-gray-500 text-sm">ברוך הבא, עידן</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ShoppingBag className="text-blue-600" size={20} />
              </div>
              <span className="text-gray-600 text-sm">הזמנות היום</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.todayOrders}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <span className="text-gray-600 text-sm">ממתין לתשלום</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.pendingPayment}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Package className="text-purple-600" size={20} />
              </div>
              <span className="text-gray-600 text-sm">נשלחו</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.shipped}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <TrendingUp className="text-green-600" size={20} />
              </div>
              <span className="text-gray-600 text-sm">הכנסות החודש</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">₪{stats.monthlyRevenue}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-pink-100 p-2 rounded-lg">
                <Users className="text-pink-600" size={20} />
              </div>
              <span className="text-gray-600 text-sm">סה"כ לקוחות</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalCustomers}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <CreditCard className="text-emerald-600" size={20} />
              </div>
              <span className="text-gray-600 text-sm">סה"כ הזמנות</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.totalOrders}</p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-700 mb-4">פעולות מהירות</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/customers" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-blue-50 transition cursor-pointer">
            <Users className="mx-auto mb-2 text-blue-600" size={28} />
            <p className="font-medium text-gray-700">לקוחות</p>
          </a>
          <a href="/orders" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-purple-50 transition cursor-pointer">
            <ShoppingBag className="mx-auto mb-2 text-purple-600" size={28} />
            <p className="font-medium text-gray-700">הזמנות</p>
          </a>
          <a href="/payments" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-green-50 transition cursor-pointer">
            <CreditCard className="mx-auto mb-2 text-green-600" size={28} />
            <p className="font-medium text-gray-700">תשלומים</p>
          </a>
          <a href="/import" className="bg-white rounded-xl p-4 shadow-sm border text-center hover:bg-orange-50 transition cursor-pointer">
            <Package className="mx-auto mb-2 text-orange-600" size={28} />
            <p className="font-medium text-gray-700">ייבוא</p>
          </a>
        </div>
      </div>
    </div>
  )
}
