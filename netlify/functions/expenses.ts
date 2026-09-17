import type { Handler } from '@netlify/functions'
import { getServiceClient, getUserAndRole, ok, err } from './_supabase'

export const handler: Handler = async (event) => {
  const supabase = getServiceClient()
  const { user, role } = await getUserAndRole(event.headers.authorization, supabase)

  if (role !== 'admin') return err('Forbidden', 403) as unknown as Awaited<ReturnType<Handler>>

  if (event.httpMethod === 'GET') {
    const { category, from, to } = event.queryStringParameters ?? {}
    let query = supabase.from('expenses').select('*').order('date', { ascending: false })
    if (category) query = query.eq('category', category)
    if (from) query = query.gte('date', from)
    if (to) query = query.lte('date', to)
    const { data, error } = await query
    if (error) return err(error.message) as unknown as Awaited<ReturnType<Handler>>
    return ok(data) as unknown as Awaited<ReturnType<Handler>>
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body ?? '{}')
    const { category, description, amount_cents, date, vendor } = body
    if (!category || !description || !amount_cents || !date) {
      return err('category, description, amount_cents, and date are required') as unknown as Awaited<ReturnType<Handler>>
    }
    const { data, error } = await supabase.from('expenses').insert({
      category, description, amount_cents, date,
      vendor: vendor || null,
      created_by: user!.id,
    }).select().single()
    if (error) return err(error.message) as unknown as Awaited<ReturnType<Handler>>
    return ok(data) as unknown as Awaited<ReturnType<Handler>>
  }

  return err('Method not allowed', 405) as unknown as Awaited<ReturnType<Handler>>
}
