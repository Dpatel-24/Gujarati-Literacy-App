import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { recordAttempt } from '@/lib/leitner';

/**
 * Temporary manual-verification route for recordAttempt(). Picks one
 * real approved content_item, records a correct attempt then an
 * incorrect one, and returns the item_progress row after each so the
 * box level / date math can be eyeballed. Safe to delete once trusted.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { rows: itemRows } = await query(
      `select id, gujarati_text from content_items where status = 'approved' order by created_at limit 1`,
    );
    if (itemRows.length === 0) {
      return res.status(400).json({ error: 'No approved content_items found to test against' });
    }
    const contentItemId = itemRows[0].id;

    // Reset any prior test runs against this item so the demo is
    // repeatable.
    await query(`delete from item_progress where content_item_id = $1`, [contentItemId]);
    await query(`delete from exercise_attempts where content_item_id = $1`, [contentItemId]);

    async function snapshot() {
      const { rows } = await query(`select * from item_progress where content_item_id = $1`, [contentItemId]);
      return rows[0];
    }

    const afterCorrect = { schedule: await recordAttempt(contentItemId, true), progress: await snapshot() };
    const afterIncorrect = { schedule: await recordAttempt(contentItemId, false), progress: await snapshot() };

    res.status(200).json({
      contentItemId,
      gujaratiText: itemRows[0].gujarati_text,
      afterCorrectAttempt: afterCorrect,
      afterIncorrectAttempt: afterIncorrect,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
