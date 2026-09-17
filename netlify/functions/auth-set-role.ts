import type { Handler } from '@netlify/functions'
import { getServiceClient, getUserAndRole, ok, err } from './_supabase'

// POST /api/auth/set-role
// Bootstraps the first admin, or lets an existing admin promote/demote users.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405) as unknown as Awaited<ReturnType<Handler>>

  const supabase = getServiceClient()
  const body = JSON.parse(event.body ?? '{}')
  const { target_user_id, role } = body

  if (!target_user_id || !role) return err('target_user_id and role are required') as unknown as Awaited<ReturnType<Handler>>
  if (!['admin', 'resident'].includes(role)) return err('role must be admin or resident') as unknown as Awaited<ReturnType<Handler>>

  // Check if any admin exists yet (bootstrap case)
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
  const isBootstrap = count === 0

  if (!isBootstrap) {
    const { role: callerRole } = await getUserAndRole(event.headers.authorization, supabase)
    if (callerRole !== 'admin') return err('Forbidden', 403) as unknown as Awaited<ReturnType<Handler>>
  }

  const { error } = await supabase.from('profiles').update({ role }).eq('id', target_user_id)
  if (error) return err(error.message) as unknown as Awaited<ReturnType<Handler>>

  return ok({ target_user_id, role }) as unknown as Awaited<ReturnType<Handler>>
}
