import { query } from '@/lib/db';

export default async function handler(req, res) {
  try {
    await query('select 1');
    res.status(200).json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(200).json({ ok: true, db: 'not configured', error: err.message });
  }
}
