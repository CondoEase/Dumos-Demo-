import type { Handler } from '@netlify/functions'
import { getServiceClient, getUserAndRole, ok, err } from './_supabase'

export const handler: Handler = async (event) => {
  const supabase = getServiceClient()
  const { role } = await getUserAndRole(event.headers.authorization, supabase)

  if (role !== 'admin') return err('Forbidden', 403) as unknown as Awaited<ReturnType<Handler>>

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body ?? '{}')
    const { full_name, email, phone, unit_id, role: newRole } = body

    if (!full_name || !email) return err('full_name and email are required') as unknown as Awaited<ReturnType<Handler>>

    // Create Supabase auth user with a temp password — they can reset via email
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })
    if (authErr || !authData.user) return err(authErr?.message ?? 'Failed to create user') as unknown as Awaited<ReturnType<Handler>>

    const { error: profileErr } = await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name,
      email,
      phone: phone || null,
      unit_id: unit_id || null,
      role: newRole ?? 'resident',
    })
    if (profileErr) return err(profileErr.message) as unknown as Awaited<ReturnType<Handler>>

    return ok({ id: authData.user.id, email }) as unknown as Awaited<ReturnType<Handler>>
  }

  return err('Method not allowed', 405) as unknown as Awaited<ReturnType<Handler>>
}
