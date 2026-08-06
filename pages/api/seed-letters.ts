import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { INDEPENDENT_VOWELS, CONSONANTS } from '@/lib/gujarati-script';

/**
 * One-time seed script: creates the "Letters" content_unit and inserts
 * every independent vowel + base consonant as an approved content_item.
 * Matras are intentionally excluded — they're a property of words, not
 * standalone letters to memorize in isolation.
 *
 * Temporary route: hit POST /api/seed-letters once, then delete this
 * file per the plan.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const { rows: unitRows } = await query(
      `insert into content_units (name, unit_type, sort_order)
       values ($1, $2, $3)
       returning id`,
      ['Letters', 'letters', 0],
    );
    const unitId = unitRows[0].id;

    const letters = [
      ...INDEPENDENT_VOWELS.map((v) => ({ char: v.char, phonetic: v.phoneticEnglish })),
      ...CONSONANTS.map((c) => ({ char: c.char, phonetic: c.phoneticEnglish })),
    ];

    const inserted = [];
    for (const letter of letters) {
      const { rows } = await query(
        `insert into content_items
           (unit_id, item_type, gujarati_text, phonetic_text, meaning, status)
         values ($1, 'letter', $2, $3, null, 'approved')
         returning id, gujarati_text, phonetic_text`,
        [unitId, letter.char, letter.phonetic],
      );
      inserted.push(rows[0]);
    }

    res.status(200).json({
      unitId,
      insertedCount: inserted.length,
      inserted,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
