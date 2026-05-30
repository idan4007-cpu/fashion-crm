import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.TRACK17_API_KEY

    const { data: shipments } = await supabase
      .from('shipments')
      .select('id, tracking_number, order_id')
      .not('tracking_number', 'is', null)

    if (!shipments || shipments.length === 0) {
      return NextResponse.json({ message: 'אין משלוחים לבדיקה' })
    }

    const trackingNumbers = shipments.map(s => ({ number: s.tracking_number }))

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

    for (const item of data.data.accepted) {
      const tracking = item.number
      const tag = item.track?.z0?.z

      let status = 'pending'
      if (tag === 40) status = 'in_transit'
      if (tag === 30) status = 'delivered'

      const shipment = shipments.find(s => s.tracking_number === tracking)
      if (shipment) {
        await supabase
          .from('shipments')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', shipment.id)
      }
    }

    return NextResponse.json({ success: true, updated: data.data.accepted.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
