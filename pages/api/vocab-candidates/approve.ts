import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * Approves a draft vocab_candidate into an approved content_items row.
 *
 * unit_id is deliberately left null here -- chapter assignment used to
 * happen automatically (a content_units row named after the source
 * text, auto-created if needed), but that's been removed in favor of
 * a dedicated assignment screen (a later step). The word still
 * carries source_text_id, so where it came from isn't lost -- it's
 * just not used to auto-place it into a chapter anymore.
 */
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
    const { rows: candidateRows } = await query(
      `select id, word_gujarati, word_phonetic, gloss_draft, status, source_text_ids
       from vocab_candidates where id = $1`,
      [id],
    );
    if (candidateRows.length === 0) {
      return res.status(404).json({ error: 'vocab_candidates row not found' });
    }
    const candidate = candidateRows[0];

    if (candidate.status !== 'draft') {
      return res.status(400).json({ error: `Candidate is already ${candidate.status}, not draft` });
    }

    const sourceTextIds: string[] = candidate.source_text_ids ?? [];
    const firstSourceTextId = sourceTextIds[0] ?? null;

    // Source text title is purely informational here (for the
    // approve confirmation message) -- not used to place the item
    // into a unit any more.
    let sourceTextTitle: string | null = null;
    if (firstSourceTextId) {
      const { rows: sourceTextRows } = await query(`select title from source_texts where id = $1`, [
        firstSourceTextId,
      ]);
      sourceTextTitle = sourceTextRows[0]?.title ?? null;
    }

    const { rows: itemRows } = await query(
      `insert into content_items
         (unit_id, item_type, gujarati_text, phonetic_text, meaning, status, source_text_id)
       values (null, 'word', $1, $2, $3, 'approved', $4)
       returning id`,
      [candidate.word_gujarati, candidate.word_phonetic, candidate.gloss_draft, firstSourceTextId],
    );
    const contentItemId = itemRows[0].id;

    await query(
      `update vocab_candidates set status = 'approved', promoted_content_item_id = $1 where id = $2`,
      [contentItemId, id],
    );

    res.status(200).json({ contentItemId, unitId: null, sourceTextTitle });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
