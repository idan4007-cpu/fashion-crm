import { supabase } from '@/lib/supabase'

// Called daily by Vercel Cron so the free Supabase project never pauses for inactivity.
// Runs a tiny database function (public.keepalive) that returns 1 and exposes no data.
export async function GET() {
  const { data, error } = await supabase.rpc('keepalive')
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: data === 1, at: new Date().toISOString() })
}
