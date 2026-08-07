import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { generateMultipleChoice, type ContentItem } from '@/lib/quiz';

/**
 * Temporary manual-verification route for generateMultipleChoice().
 * Pulls all approved content_items in the Letters unit as the pool,
 * generates a question for a handful of them, and prints question +
 * options so distractor quality can be eyeballed. Safe to delete once
 * trusted.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { rows: pool } = await query(
      `select id, gujarati_text, phonetic_text, meaning, item_type, unit_id
       from content_items
       where status = 'approved'`,
    );

    const lettersUnit = pool.filter((item: ContentItem) => item.item_type === 'letter');
    if (lettersUnit.length === 0) {
      return res.status(400).json({ error: 'No approved letter content_items found to test against' });
    }

    const sampleSize = Math.min(5, lettersUnit.length);
    const sample = lettersUnit.slice(0, sampleSize);

    const results = sample.map((item: ContentItem) => {
      const mc = generateMultipleChoice(item, pool);
      return {
        gujaratiText: item.gujarati_text,
        prompt: item.item_type === 'letter' ? 'What does this say?' : 'What does this mean?',
        options: mc.options,
        correctAnswer: mc.correctAnswer,
      };
    });

    res.status(200).json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
