import type { Handler } from '@netlify/functions'
import { getServiceClient, getUserAndRole, ok, err } from './_supabase'

export const handler: Handler = async (event) => {
  const supabase = getServiceClient()
  const { role } = await getUserAndRole(event.headers.authorization, supabase)

  if (role !== 'admin') return err('Forbidden', 403) as unknown as Awaited<ReturnType<Handler>>

  const parts = event.path.split('/')
  const unitId = parts[parts.length - 1] !== 'units' ? parts[parts.length - 1] : null

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('units')
      .select('*, owner:owner_profile_id(id,full_name,email), tenant:tenant_profile_id(id,full_name,email)')
      .order('unit_number')
    if (error) return err(error.message) as unknown as Awaited<ReturnType<Handler>>
    return ok(data) as unknown as Awaited<ReturnType<Handler>>
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body ?? '{}')
    const { unit_number, block, floor, square_footage } = body
    if (!unit_number) return err('unit_number is required') as unknown as Awaited<ReturnType<Handler>>
    const { data, error } = await supabase.from('units').insert({
      unit_number, block: block || null, floor: floor || null,
      square_footage: square_footage ?? 0,
    }).select().single()
    if (error) return err(error.message) as unknown as Awaited<ReturnType<Handler>>
    return ok(data) as unknown as Awaited<ReturnType<Handler>>
  }

  if (event.httpMethod === 'PUT' && unitId) {
    const body = JSON.parse(event.body ?? '{}')
    const { data, error } = await supabase.from('units').update(body).eq('id', unitId).select().single()
    if (error) return err(error.message) as unknown as Awaited<ReturnType<Handler>>
    return ok(data) as unknown as Awaited<ReturnType<Handler>>
  }

  return err('Method not allowed', 405) as unknown as Awaited<ReturnType<Handler>>
}
