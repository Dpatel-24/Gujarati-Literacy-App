import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET' });
  }

  const id = req.query.id as string;

  try {
    const { rows } = await query(
      `select id, gujarati_text, phonetic_text, meaning
       from content_items
       where unit_id = $1 and item_type = 'word' and status = 'approved'
       order by gujarati_text`,
      [id],
    );
    res.status(200).json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
