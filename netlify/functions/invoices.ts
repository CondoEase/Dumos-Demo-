import type { Handler } from '@netlify/functions'
import { getServiceClient, getUserAndRole, ok, err } from './_supabase'

export const handler: Handler = async (event) => {
  const supabase = getServiceClient()
  const { role } = await getUserAndRole(event.headers.authorization, supabase)

  if (role !== 'admin') return err('Forbidden', 403) as unknown as Awaited<ReturnType<Handler>>

  const path = event.path

  // POST /api/invoices/generate
  if (event.httpMethod === 'POST' && path.endsWith('/generate')) {
    const body = JSON.parse(event.body ?? '{}')
    const { period, due_date } = body

    if (!period || !due_date) return err('period and due_date are required') as unknown as Awaited<ReturnType<Handler>>

    // Get latest rate
    const { data: rates } = await supabase
      .from('maintenance_rates')
      .select('*')
      .lte('effective_from', `${period}-28`)
      .order('effective_from', { ascending: false })
      .limit(1)

    const rate = rates?.[0]
    if (!rate) return err('No maintenance rate found for this period') as unknown as Awaited<ReturnType<Handler>>

    // Get all units
    const { data: units } = await supabase.from('units').select('id, square_footage')
    if (!units || units.length === 0) return err('No units found') as unknown as Awaited<ReturnType<Handler>>

    // Get already-invoiced units for this period
    const { data: existing } = await supabase
      .from('invoices')
      .select('unit_id')
      .eq('period', period)
    const invoicedIds = new Set((existing ?? []).map((i) => i.unit_id))

    const toInsert = units
      .filter((u) => !invoicedIds.has(u.id))
      .map((u) => {
        const amount = rate.flat_rate_cents
          ? rate.flat_rate_cents
          : Math.round(rate.rate_per_sqft * u.square_footage)
        return { unit_id: u.id, period, amount_due_cents: amount, due_date, status: 'pending' }
      })

    if (toInsert.length > 0) {
      const { error } = await supabase.from('invoices').insert(toInsert)
      if (error) return err(error.message) as unknown as Awaited<ReturnType<Handler>>
    }

    return ok({ created: toInsert.length, skipped: invoicedIds.size }) as unknown as Awaited<ReturnType<Handler>>
  }

  // GET /api/invoices
  if (event.httpMethod === 'GET') {
    const { unit_id, status, period } = event.queryStringParameters ?? {}
    let query = supabase.from('invoices').select('*, unit:unit_id(id, unit_number, block)')

    if (unit_id) query = query.eq('unit_id', unit_id)
    if (status) query = query.eq('status', status)
    if (period) query = query.eq('period', period)

    query = query.order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) return err(error.message) as unknown as Awaited<ReturnType<Handler>>
    return ok(data) as unknown as Awaited<ReturnType<Handler>>
  }

  return err('Method not allowed', 405) as unknown as Awaited<ReturnType<Handler>>
}
