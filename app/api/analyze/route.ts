import { NextRequest, NextResponse } from 'next/server'

function splitToChunks(text: string, chunkSize: number = 3000): string[] {
  const lines = text.split('\n')
  const chunks: string[] = []
  let current = ''

  for (const line of lines) {
    if ((current + line).length > chunkSize) {
      if (current) chunks.push(current)
      current = line + '\n'
    } else {
      current += line + '\n'
    }
  }
  if (current) chunks.push(current)
  return chunks
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    const chunks = splitToChunks(text)
    const allOrders: object[] = []

    for (const chunk of chunks) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `אתה מנתח טקסט מקבוצת וואטסאפ של עסק אופנה.
חלץ את כל ההזמנות מהטקסט הבא והחזר JSON בלבד, ללא טקסט נוסף, ללא backticks.
אם אין הזמנות בטקסט, החזר מערך ריק: []

הפורמט:
[{"order_number":"11558","name":"שם מלא","phone":"טלפון","address":"כתובת","city":"עיר","zip":"מיקוד","size":"מידה","color":"צבע"}]

חשוב:
- אם לקוח הזמין כמה פריטים — שורה נפרדת לכל הזמנה
- התעלם מ"התמונה הושמטה" ו"הודעה זו נמחקה"
- החזר JSON בלבד

הטקסט:
${chunk}`
          }]
        })
      })

      const data = await response.json()
      const content = data.content?.[0]?.text || '[]'
      const clean = content.replace(/```json|```/g, '').trim()
      
      try {
        const orders = JSON.parse(clean)
        if (Array.isArray(orders)) allOrders.push(...orders)
      } catch {
        console.log('Chunk parse error, skipping')
      }
    }

    // הסר כפילויות לפי מספר הזמנה
    const unique = allOrders.filter((order: any, index, self) =>
      index === self.findIndex((o: any) => o.order_number === order.order_number)
    )

    return NextResponse.json({ orders: unique })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
