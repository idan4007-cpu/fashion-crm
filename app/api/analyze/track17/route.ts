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

    const { data: shipments } = await supabase
      .from('shipments')
      .select('id, tracking_number')
      .not('tracking_number', 'is', null)
      .neq('status', 'delivered')

    if (!shipments || shipments.length === 0) {
      return NextResponse.json({ message: 'אין משלוחים לבדיקה' })
    }

    const trackingNumbers = shipments.map(s => ({ number: s.tracking_number }))

    await fetch('https://api.17track.net/track/v2.2/register', {
      method: 'POST',
      headers: {
        '17token': apiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trackingNumbers)
    })

    const response = await fetch('https://api.17track.net/track/v2.2/gettrackinfo', {
      method: 'POST',
      headers: {
        '17token': apiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trackingNumbers)
    })

    const data = await response.json()

    if (!data.data?.accepted) {
      return NextResponse.json({ error: 'שגיאה מ-17Track', data })
    }

    let updated = 0

    for (const item of data.data.accepted) {
      const tracking = item.number
      const tag = item.track?.z0?.z

      let status = 'in_transit'
      if (tag === 30 || tag === 50) status = 'delivered'
      if (tag === 35) status = 'undelivered'

      const shipment = shipments.find(s => s.tracking_number === tracking)
      if (shipment) {
        await supabase
          .from('shipments')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', shipment.id)
        updated++
      }
    }

    return NextResponse.json({ success: true, updated })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
