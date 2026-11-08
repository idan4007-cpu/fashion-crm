import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function bearer(req: Request) {
  const header = req.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

// Returns a Supabase client acting as the logged-in user, or null if the request isn't authenticated.
export async function getUserClient(req: Request): Promise<SupabaseClient | null> {
  const token = bearer(req)
  if (!token) return null
  const client = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return client
}

// For scheduled jobs (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>").
// Uses the service-role key, which must only ever live in server env vars.
export function getCronClient(req: Request): SupabaseClient | null {
  const secret = process.env.CRON_SECRET
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || !serviceKey || bearer(req) !== secret) return null
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function unauthorized() {
  return Response.json({ error: 'unauthorized' }, { status: 401 })
}
