import { supabase } from './supabase'

// fetch to our own API routes, sending the logged-in user's access token
export async function authFetch(url: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`)
  return fetch(url, { ...init, headers })
}
