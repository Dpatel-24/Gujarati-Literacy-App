import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET' });
  }

  try {
    const { rows } = await query(
      `select id, word_gujarati, word_phonetic, frequency_count, gloss_draft,
              status, source_text_ids, promoted_content_item_id, created_at
       from vocab_candidates
       where status = 'draft'
       order by frequency_count desc, created_at asc`,
    );
    res.status(200).json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
