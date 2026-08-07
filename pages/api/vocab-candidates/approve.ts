import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * Finds the content_units row named after the candidate's source text
 * (unit_type 'words'), creating it if it doesn't exist yet. Units are
 * grouped by source text title so words promoted from the same poem
 * end up in the same practice unit.
 */
async function findOrCreateWordsUnit(sourceTextTitle: string): Promise<string> {
  const { rows: existing } = await query(
    `select id from content_units where name = $1 and unit_type = 'words' limit 1`,
    [sourceTextTitle],
  );
  if (existing.length > 0) {
    return existing[0].id;
  }

  const { rows: maxSort } = await query(`select coalesce(max(sort_order), -1) as max_sort from content_units`);
  const nextSortOrder = maxSort[0].max_sort + 1;

  const { rows: created } = await query(
    `insert into content_units (name, unit_type, sort_order) values ($1, 'words', $2) returning id`,
    [sourceTextTitle, nextSortOrder],
  );
  return created[0].id;
}

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
    if (sourceTextIds.length === 0) {
      return res.status(400).json({ error: 'Candidate has no source_text_ids to derive a unit from' });
    }
    const firstSourceTextId = sourceTextIds[0];

    const { rows: sourceTextRows } = await query(`select id, title from source_texts where id = $1`, [
      firstSourceTextId,
    ]);
    if (sourceTextRows.length === 0) {
      return res.status(400).json({ error: `source_texts row not found for id ${firstSourceTextId}` });
    }
    const sourceTextTitle = sourceTextRows[0].title;

    const unitId = await findOrCreateWordsUnit(sourceTextTitle);

    const { rows: itemRows } = await query(
      `insert into content_items
         (unit_id, item_type, gujarati_text, phonetic_text, meaning, status, source_text_id)
       values ($1, 'word', $2, $3, $4, 'approved', $5)
       returning id`,
      [unitId, candidate.word_gujarati, candidate.word_phonetic, candidate.gloss_draft, firstSourceTextId],
    );
    const contentItemId = itemRows[0].id;

    await query(
      `update vocab_candidates set status = 'approved', promoted_content_item_id = $1 where id = $2`,
      [contentItemId, id],
    );

    res.status(200).json({ contentItemId, unitId, unitName: sourceTextTitle });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
