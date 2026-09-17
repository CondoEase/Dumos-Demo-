import { createClient, SupabaseClient } from '@supabase/supabase-js'

export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getUserAndRole(authHeader: string | undefined, serviceClient: SupabaseClient) {
  if (!authHeader?.startsWith('Bearer ')) return { user: null, role: null }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await serviceClient.auth.getUser(token)
  if (error || !user) return { user: null, role: null }
  const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  return { user, role: profile?.role ?? null }
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function ok<T>(data: T) {
  return json({ data, error: null })
}

export function err(message: string, status = 400) {
  return json({ data: null, error: message }, status)
}
