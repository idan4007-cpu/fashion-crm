import { supabase } from './supabase'

// Supabase returns at most 1000 rows per request (even with .limit(5000)).
// This loads every matching row by fetching pages of 1000 in parallel.
// `id` is always added as a final sort key so pages never overlap or skip rows
// when the main sort column has ties (e.g. many orders on the same date).
const PAGE = 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Build = (q: any) => any

export async function fetchAll<T = any>(table: string, select: string, build: Build = q => q): Promise<T[]> {
  const { count, error } = await build(
    supabase.from(table).select('id', { count: 'exact', head: true })
  )
  if (error || !count) return []

  const pages = Math.ceil(count / PAGE)
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      build(supabase.from(table).select(select))
        .order('id', { ascending: true })
        .range(i * PAGE, i * PAGE + PAGE - 1)
    )
  )

  const rows: T[] = []
  for (const r of results as { data: T[] | null }[]) if (r.data) rows.push(...r.data)
  return rows
}
