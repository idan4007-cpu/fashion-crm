'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type MonthData = {
  month: string
  orders: number
  revenue: number
  cost: number
  profit: number
  vat: number
}

type YearData = {
  year: string
  months: MonthData[]
  totalRevenue: number
  totalCost: number
  totalProfit: number
  totalVat: number
  totalOrders: number
}

type PaymentData = {
  method: string
  count: number
  total: number
}

const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function Analytics() {
  const [years, setYears] = useState<YearData[]>([])
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [loading, setLoading] = useState(true)
  const [openYear, setOpenYear] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: orders } = await supabase
      .from('orders')
      .select('order_date, price, cost_price, payment_method')
      .not('order_date', 'is', null)

    if (!orders) { setLoading(false); return }

    // פילוח לפי שנה וחודש
    const yearMap: Record<string, Record<string, MonthData>> = {}

    for (const o of orders) {
      const date = new Date(o.order_date)
      const year = date.getFullYear().toString()
      const month = date.getMonth()
      const monthKey = String(month)

      if (!yearMap[year]) yearMap[year] = {}
      if (!yearMap[year][monthKey]) {
        yearMap[year][monthKey] = {
          month: monthNames[month],
          orders: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          vat: 0
        }
      }

      const price = o.price || 0
      const cost = o.cost_price || 0
      const profit = (price - cost) * 0.82
      const vat = (price - cost) * 0.18

      yearMap[year][monthKey].orders++
      yearMap[year][monthKey].revenue += price
      yearMap[year][monthKey].cost += cost
      yearMap[year][monthKey].profit += profit
      yearMap[year][monthKey].vat += vat
    }

    const yearsData: YearData[] = Object.keys(yearMap)
      .sort((a, b) => Number(b) - Number(a))
      .map(year => {
        const months = Object.keys(yearMap[year])
          .sort((a, b) => Number(a) - Number(b))
          .map(m => yearMap[year][m])

        const totalRevenue = months.reduce((s, m) => s + m.revenue, 0)
        const totalCost = months.reduce((s, m) => s + m.cost, 0)
        const totalProfit = months.reduce((s, m) => s + m.profit, 0)
        const totalVat = months.reduce((s, m) => s + m.vat, 0)
        const totalOrders = months.reduce((s, m) => s + m.orders, 0)

        return { year, months, totalRevenue, totalCost, totalProfit, totalVat, totalOrders }
      })

    setYears(yearsData)

    // פילוח לפי אמצעי תשלום
    const paymentMap: Record<string, { count: number, total: number }> = {}
    for (const o of orders) {
      const method = o.payment_method || 'לא צוין'
      if (!paymentMap[method]) paymentMap[method] = { count: 0, total: 0 }
      paymentMap[method].count++
      paymentMap[method].total += o.price || 0
    }

    const paymentsData = Object.entries(paymentMap)
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.total - a.total)

    setPayments(paymentsData)
    setLoading(false)
  }

  const fmt = (n: number) => `₪${Math.round(n).toLocaleString()}`

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📊 אנליטיקה</h1>
            <p className="text-gray-500 text-sm">סיכום הכנסות, רווחים ומע"מ</p>
          </div>
          <a href="/" className="text-sm text-gray-500 px-3 py-2">🏠 דשבורד</a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-gray-500 py-8">טוען נתונים...</p>
        ) : (
          <>
            {/* פילוח לפי אמצעי תשלום */}
            <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <h2 className="text-lg font-bold mb-4">💳 פילוח לפי אמצעי תשלום</h2>
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-700">{p.method}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.count} הזמנות</span>
                    </div>
                    <span className="font-bold text-gray-800">{fmt(p.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* סיכום לפי שנים */}
            <h2 className="text-lg font-bold mb-4">📅 סיכום לפי שנים</h2>
            <div className="space-y-4">
              {years.map(y => (
                <div key={y.year} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  {/* כותרת שנה */}
                  <button
                    onClick={() => setOpenYear(openYear === y.year ? null : y.year)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-800">{y.year}</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{y.totalOrders} הזמנות</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-600">הכנסות: <strong>{fmt(y.totalRevenue)}</strong></span>
                      <span className="text-green-600">רווח: <strong>{fmt(y.totalProfit)}</strong></span>
                      <span className="text-orange-500">מע"מ: <strong>{fmt(y.totalVat)}</strong></span>
                      <span className="text-gray-400">{openYear === y.year ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* פירוט חודשים */}
                  {openYear === y.year && (
                    <div className="border-t">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-right text-gray-600">חודש</th>
                            <th className="px-4 py-2 text-right text-gray-600">הזמנות</th>
                            <th className="px-4 py-2 text-right text-gray-600">הכנסות</th>
                            <th className="px-4 py-2 text-right text-gray-600">עלות</th>
                            <th className="px-4 py-2 text-right text-gray-600">רווח נטו</th>
                            <th className="px-4 py-2 text-right text-gray-600">מע"מ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {y.months.map((m, i) => (
                            <tr key={i} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium">{m.month}</td>
                              <td className="px-4 py-2 text-gray-600">{m.orders}</td>
                              <td className="px-4 py-2 text-gray-800">{fmt(m.revenue)}</td>
                              <td className="px-4 py-2 text-red-500">{fmt(m.cost)}</td>
                              <td className="px-4 py-2 text-green-600 font-medium">{fmt(m.profit)}</td>
                              <td className="px-4 py-2 text-orange-500">{fmt(m.vat)}</td>
                            </tr>
                          ))}
                          {/* סיכום שנה */}
                          <tr className="border-t bg-gray-50 font-bold">
                            <td className="px-4 py-2">סה"כ {y.year}</td>
                            <td className="px-4 py-2">{y.totalOrders}</td>
                            <td className="px-4 py-2">{fmt(y.totalRevenue)}</td>
                            <td className="px-4 py-2 text-red-500">{fmt(y.totalCost)}</td>
                            <td className="px-4 py-2 text-green-600">{fmt(y.totalProfit)}</td>
                            <td className="px-4 py-2 text-orange-500">{fmt(y.totalVat)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
