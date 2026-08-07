import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const { id } = req.body as { id?: string };
  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  try {
    const { rows } = await query(
      `update vocab_candidates set status = 'rejected' where id = $1 and status = 'draft' returning id`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Candidate not found or not in draft status' });
    }
    res.status(200).json({ id: rows[0].id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
