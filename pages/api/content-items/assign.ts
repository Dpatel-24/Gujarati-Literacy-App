import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * Sets (or clears) a content_items row's unit_id. Used for assigning
 * an unassigned word to a vocabulary group, reassigning it to a
 * different group, or unassigning it back to null -- unitId: null
 * covers the unassign case.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const { itemId, unitId } = req.body as { itemId?: string; unitId?: string | null };
  if (!itemId) {
    return res.status(400).json({ error: 'Missing itemId' });
  }

  try {
    const { rows } = await query(
      `update content_items set unit_id = $1 where id = $2 returning id, unit_id`,
      [unitId ?? null, itemId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'content_items row not found' });
    }
    res.status(200).json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
