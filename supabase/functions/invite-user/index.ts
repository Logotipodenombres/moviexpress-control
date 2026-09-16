import { createClient } from 'npm:@supabase/supabase-js@2';
const allowedOrigin = Deno.env.get('APP_ORIGIN') || '';
const headers = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  Vary: 'Origin',
  'Content-Type': 'application/json',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (req) => {
  if (req.headers.get('Origin') !== allowedOrigin || !allowedOrigin)
    return reply(403, { error: 'Origen no permitido.' });
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, { error: 'Método no permitido.' });
  try {
    const url = Deno.env.get('SUPABASE_URL')!,
      anon = Deno.env.get('SUPABASE_ANON_KEY')!,
      service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return reply(401, { error: 'Sesión requerida.' });
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error: authError,
    } = await caller.auth.getUser();
    if (authError || !user) return reply(401, { error: 'Sesión inválida.' });
    const { data: profile } = await caller.from('profiles').select('*').eq('id', user.id).single();
    if (!profile?.active || profile.role !== 'admin')
      return reply(403, { error: 'Solo un administrador puede invitar usuarios.' });
    const body = await req.json();
    const { email, full_name, role } = body;
    if (
      typeof email !== 'string' ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      email.length > 254 ||
      typeof full_name !== 'string' ||
      full_name.trim().length < 2 ||
      full_name.length > 160 ||
      !['admin', 'operator', 'viewer'].includes(role)
    )
      return reply(400, { error: 'Nombre, correo o rol inválidos.' });
    if (body.organization_id && body.organization_id !== profile.organization_id)
      return reply(403, { error: 'La organización debe ser la del administrador.' });
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const redirectTo = Deno.env.get('APP_URL');
    if (!redirectTo) return reply(500, { error: 'Configura APP_URL en la función.' });
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
      redirectTo: redirectTo + '?flow=invite',
      data: { full_name: full_name.trim() },
    });
    if (error)
      return reply(400, {
        error:
          'No se pudo invitar. Comprueba si el correo ya tiene cuenta y la configuración de envío.',
      });
    const { error: profileError } = await admin
      .from('profiles')
      .insert({
        id: data.user.id,
        organization_id: profile.organization_id,
        full_name: full_name.trim(),
        role,
      });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return reply(500, {
        error: 'No se pudo asignar el perfil. Se revocó la invitación; inténtalo de nuevo.',
      });
    }
    await admin
      .from('audit_logs')
      .insert({
        organization_id: profile.organization_id,
        actor_id: user.id,
        action: 'INVITE',
        entity: 'profiles',
        entity_id: data.user.id,
      });
    return reply(200, { ok: true });
  } catch {
    return reply(500, { error: 'No se pudo completar la invitación.' });
  }
});
