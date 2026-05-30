'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type CustomerActivity = {
  id: string
  name: string
  phone: string
  city: string
  total_orders: number
  last_order_date: string | null
  total_spent: number
  days_inactive: number
}

export default function Dormant() {
  const [customers, setCustomers] = useState<CustomerActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: customersList } = await supabase
      .from('customers')
      .select('id, name, phone, city')
      .limit(5000)

    if (!customersList) { setLoading(false); return }

    // מביא את כל ההזמנות ממוינות מהחדשה לישנה
    let allOrders: any[] = []
    let from = 0
    const batchSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('orders')
        .select('customer_id, order_date, price')
        .not('order_date', 'is', null)
        .order('order_date', { ascending: false })
        .range(from, from + batchSize - 1)

      if (error || !data || data.length === 0) break
      allOrders = [...allOrders, ...data]
      if (data.length < batchSize) break
      from += batchSize
    }

    const today = new Date()

    const activity: CustomerActivity[] = customersList.map(c => {
      const customerOrders = allOrders.filter(o => o.customer_id === c.id)
      if (customerOrders.length === 0) return null

      const dates = customerOrders
        .map(o => new Date(o.order_date))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())

      const lastDate = dates[0] || null
      const daysDiff = lastDate
        ? Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        : 9999

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        city: c.city,
        total_orders: customerOrders.length,
        last_order_date: lastDate ? lastDate.toLocaleDateString('he-IL') : null,
        total_spent: customerOrders.reduce((s, o) => s + (o.price || 0), 0),
        days_inactive: daysDiff
      }
    }).filter((c): c is CustomerActivity => c !== null)

    setCustomers(activity)
    setLoading(false)
  }

  const sortByOrders = (list: CustomerActivity[]) =>
    [...list].sort((a, b) => b.total_orders - a.total_orders)

  const dormantYear = sortByOrders(customers.filter(c => c.days_inactive > 365))
  const dormant6to12 = sortByOrders(customers.filter(c => c.days_inactive > 180 && c.days_inactive <= 365))
  const active = sortByOrders(customers.filter(c => c.days_inactive <= 180))

  function whatsappLink(phone: string, name: string) {
    const msg = encodeURIComponent(`היי ${name} 😊 מזמן לא דיברנו! יש לנו מוצרים חדשים שאני בטוח/ה שתאהב/י ❤️ רוצה לשמוע?`)
    const clean = phone.replace(/\D/g, '')
    const intl = clean.startsWith('0') ? '972' + clean.slice(1) : clean
    return `https://wa.me/${intl}?text=${msg}`
  }

  const CustomerCard = ({ c }: { c: CustomerActivity }) => (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
      <div className="flex-1">
        <p className="font-medium text-gray-800">{c.name}</p>
        <div className="flex gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-500">📞 {c.phone}</span>
          {c.city && <span className="text-xs text-gray-500">📍 {c.city}</span>}
        </div>
        <div className="flex gap-3 mt-0.5 flex-wrap">
          <span className="text-xs font-bold text-purple-600">🛍️ {c.total_orders} הזמנות</span>
          <span className="text-xs text-green-600">₪{Math.round(c.total_spent).toLocaleString()}</span>
          {c.last_order_date && <span className="text-xs text-gray-400">אחרונה: {c.last_order_date}</span>}
        </div>
      </div>
      <a href={whatsappLink(c.phone, c.name)} target="_blank" rel="noopener noreferrer"
        className="bg-green-500 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1 whitespace-nowrap mr-2">
        📱 וואטסאפ
      </a>
    </div>
  )

  const Section = ({
    title, color, bgColor, borderColor, textColor, badgeColor, desc, list
  }: {
    title: string, color: string, bgColor: string, borderColor: string,
    textColor: string, badgeColor: string, desc: string,
    list: CustomerActivity[]
  }) => (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className={`${bgColor} px-5 py-4 border-b ${borderColor}`}>
        <div className="flex items-center justify-between">
          <h2 className={`font-bold ${textColor} text-lg`}>{title}</h2>
          <span className={`${badgeColor} text-sm px-3 py-1 rounded-full font-medium`}>
            {list.length} לקוחות
          </span>
        </div>
        <p className={`${color} text-sm mt-1`}>{desc}</p>
        {list.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            ממוין לפי מספר הזמנות — הלקוחות הנאמנים ביותר ראשונים
          </p>
        )}
      </div>
      <div className="p-4 space-y-3">
        {list.length === 0 ? (
          <p className="text-gray-400 text-center py-4">אין לקוחות בקטגוריה זו</p>
        ) : (
          list.slice(0, 100).map(c => <CustomerCard key={c.id} c={c} />)
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">🔔 לקוחות רדומים</h1>
            <p className="text-gray-500 text-sm">מסודר לפי נאמנות — הלקוחות הטובים ביותר ראשונים</p>
          </div>
          <a href="/" className="text-sm text-gray-500 px-3 py-2">🏠 דשבורד</a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-gray-500 py-8">⏳ טוען נתונים, אנא המתן...</p>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-sm text-blue-700">
              מציג {customers.length} לקוחות עם תאריך הזמנה ידוע
            </div>

            <div className="space-y-6">
              <Section
                title="🔴 רדום מעל שנה"
                color="text-red-500"
                bgColor="bg-red-50"
                borderColor="border-red-100"
                textColor="text-red-700"
                badgeColor="bg-red-100 text-red-700"
                desc="לא קנו מעל 365 יום — דחוף לעיר!"
                list={dormantYear}
              />
              <Section
                title="🟡 רדום 6-12 חודשים"
                color="text-yellow-600"
                bgColor="bg-yellow-50"
                borderColor="border-yellow-100"
                textColor="text-yellow-700"
                badgeColor="bg-yellow-100 text-yellow-700"
                desc="לא קנו 6-12 חודשים — כדאי ליצור קשר"
                list={dormant6to12}
              />
              <Section
                title="🟢 פעיל 6 חודשים אחרונים"
                color="text-green-600"
                bgColor="bg-green-50"
                borderColor="border-green-100"
                textColor="text-green-700"
                badgeColor="bg-green-100 text-green-700"
                desc="קנו ב-6 חודשים האחרונים — לקוחות פעילים!"
                list={active}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
