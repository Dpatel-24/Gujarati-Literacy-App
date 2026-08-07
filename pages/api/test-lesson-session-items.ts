import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * Supplies a small mixed batch (some letters, one word if any exist)
 * for the LessonSession test harness page. Temporary, same lifecycle
 * as pages/admin/test-lesson-session.tsx.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { rows: letters } = await query(
      `select id, gujarati_text, phonetic_text, meaning, item_type, unit_id
       from content_items where status = 'approved' and item_type = 'letter'
       order by created_at limit 3`,
    );
    const { rows: words } = await query(
      `select id, gujarati_text, phonetic_text, meaning, item_type, unit_id
       from content_items where status = 'approved' and item_type = 'word'
       order by created_at limit 2`,
    );

    res.status(200).json([...letters, ...words]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
