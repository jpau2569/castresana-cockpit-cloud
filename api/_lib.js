// Helpers compartidos (no es una ruta porque empieza por "_")
import { createClient } from '@supabase/supabase-js';

export function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// la peticion trae la cookie de sesion valida?
export function isAuthed(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/cockpit_auth=([^;]+)/);
  return !!(m && m[1] === process.env.AUTH_SECRET);
}

export async function loadState() {
  const { data, error } = await db()
    .from('cockpit_state')
    .select('data')
    .eq('id', 'pau')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data && data.data) || {};
}

export async function saveState(state) {
  const { error } = await db()
    .from('cockpit_state')
    .upsert({ id: 'pau', data: state, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// body puede llegar como objeto (Vercel ya lo parsea) o string
export function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  return b || {};
}
