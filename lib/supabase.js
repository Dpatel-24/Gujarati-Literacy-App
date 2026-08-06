import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Browser client — use in client components / pages. Respects RLS as the
 * signed-in user (auth.uid()).
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Server client for getServerSideProps — reads/writes the auth cookie so
 * RLS policies see the correct auth.uid().
 */
export function createServerSupabaseClient(context) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return context.req.cookies[name];
      },
      set(name, value, options) {
        context.res.setHeader('Set-Cookie', `${name}=${value}; Path=/; ${serializeOptions(options)}`);
      },
      remove(name, options) {
        context.res.setHeader('Set-Cookie', `${name}=; Path=/; Max-Age=0; ${serializeOptions(options)}`);
      },
    },
  });
}

/**
 * Server client for API routes (pages/api/*) — same cookie-aware pattern.
 */
export function createApiSupabaseClient(req, res) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return req.cookies[name];
      },
      set(name, value, options) {
        res.setHeader('Set-Cookie', `${name}=${value}; Path=/; ${serializeOptions(options)}`);
      },
      remove(name, options) {
        res.setHeader('Set-Cookie', `${name}=; Path=/; Max-Age=0; ${serializeOptions(options)}`);
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS entirely. Server-side only (never
 * import this in client code, and never expose SUPABASE_SERVICE_ROLE_KEY
 * with a NEXT_PUBLIC_ prefix). Use sparingly, e.g. for background jobs.
 */
export function createServiceRoleClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function serializeOptions(options = {}) {
  const parts = [];
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push('Secure');
  if (options.httpOnly) parts.push('HttpOnly');
  return parts.join('; ');
}
