import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Neon's serverless driver needs a WebSocket implementation outside the
// browser/edge runtime (i.e. in plain Node, like Next.js API routes / SSR).
neonConfig.webSocketConstructor = ws;

let pool;

/**
 * Shared connection pool for server-side code (API routes, getServerSideProps).
 * Never import this from client-side code — DATABASE_URL must stay server-only.
 */
export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

/**
 * Convenience helper for a single query.
 *   const { rows } = await query('select * from content_units order by sort_order');
 */
export function query(text, params) {
  return getPool().query(text, params);
}
