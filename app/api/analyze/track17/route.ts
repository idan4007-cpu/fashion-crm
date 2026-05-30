import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  return await syncShipments()
}

export async function POST(req: NextRequest) {
  return await syncShipments()
}

async function syncShipments() {
  try {
    const apiKey = process.env.TRACK17_API_KEY

    // מושך את כל המשלוחים מ-17Track
    const response = await fetch('https://api.17track.net/track/v2.2/gettracklist', {
      method: 'POST',
      headers: {
        '17token': apiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_no: 1,
        page_size: 100
      })
    })

    const data = await response.json()

    if (!data.data?.accepted) {
      return NextResponse.json({ error: 'שגיאה מ-17Track', data })
    }

    let imported = 0
    let updated = 0

    for (const item of data.data.accepted) {
      const trackingNumber = item.number
      const tag = item.track?.z0?.z
      const friendlyName = item.friendly_name || ''

      // חילוץ מספר הזמנה מהשם: "order 11527-Rima daniel-..."
      const orderMatch = friendlyName.match(/order\s+(\d+)/i)
      if (!orderMatch) continue
      const orderNumber = parseInt(orderMatch[1])

      // מציאת ההזמנה במערכת
      const { data: orderData } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .single()

      if (!orderData) continue

      // סטטוס
      let status = 'pending'
      if (tag === 40) status = 'in_transit'
      if (tag === 30) status = 'delivered'
      if (tag === 50) status = 'delivered'

      // בדיקה אם משלוח קיים
      const { data: existing } = await supabase
        .from('shipments')
        .select('id')
        .eq('tracking_number', trackingNumber)
        .single()

      if (existing) {
        // עדכון סטטוס
        await supabase
          .from('shipments')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        updated++
      } else {
        // הוספה חדשה
        await supabase
          .from('shipments')
          .insert([{
            order_id: orderData.id,
            tracking_number: trackingNumber,
            courier: item.carrier || 'FedEx',
            status,
            address: '',
            updated_at: new Date().toISOString()
          }])
        imported++
      }
    }

    return NextResponse.json({ success: true, imported, updated })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
