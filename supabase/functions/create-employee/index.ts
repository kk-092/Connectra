import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Payload = {
  fullName?: string
  email?: string
  password?: string
  role?: 'admin' | 'employee'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server is missing Supabase service configuration.' }, 500)
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization) {
    return json({ error: 'Missing authorization header.' }, 401)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authorization } },
  })

  const { data: caller } = await userClient.auth.getUser()
  if (!caller.user) {
    return json({ error: 'Invalid session.' }, 401)
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, status')
    .eq('id', caller.user.id)
    .single()

  if (callerProfile?.role !== 'admin' || callerProfile?.status !== 'active') {
    return json({ error: 'Admin access required.' }, 403)
  }

  const payload = (await request.json()) as Payload
  const fullName = payload.fullName?.trim()
  const email = payload.email?.trim().toLowerCase()
  const password = payload.password?.trim()
  const role = payload.role === 'admin' ? 'admin' : 'employee'

  if (!fullName || !email || !password || password.length < 8) {
    return json({ error: 'Full name, valid email, and 8+ character password are required.' }, 400)
  }

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })

  if (createError || !createdUser.user) {
    return json({ error: createError?.message ?? 'Could not create user.' }, 400)
  }

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: createdUser.user.id,
    full_name: fullName,
    email,
    role,
    status: 'active',
  })

  if (profileError) {
    return json({ error: profileError.message }, 400)
  }

  await adminClient.from('audit_logs').insert({
    actor_id: caller.user.id,
    action: 'employee.created',
    target_id: createdUser.user.id,
    metadata: { email, role },
  })

  return json({ ok: true })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
