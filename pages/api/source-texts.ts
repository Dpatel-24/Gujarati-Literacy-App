import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

interface StanzaPair {
  gujarati: string;
  phonetic: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const { title, gujaratiRaw, phoneticRaw, stanzaPairs } = req.body as {
    title?: string;
    gujaratiRaw?: string;
    phoneticRaw?: string;
    stanzaPairs?: StanzaPair[];
  };

  if (!title || !gujaratiRaw || !phoneticRaw || !Array.isArray(stanzaPairs)) {
    return res.status(400).json({ error: 'Missing title, gujaratiRaw, phoneticRaw, or stanzaPairs' });
  }

  try {
    const { rows } = await query(
      `insert into source_texts (title, gujarati_raw, phonetic_raw, stanza_pairs)
       values ($1, $2, $3, $4)
       returning id`,
      [title, gujaratiRaw, phoneticRaw, JSON.stringify(stanzaPairs)],
    );

    res.status(200).json({ id: rows[0].id, stanzaCount: stanzaPairs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
