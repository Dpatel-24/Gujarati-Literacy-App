import type { NextApiRequest, NextApiResponse } from 'next';
import { extractVocab } from '@/lib/extract-vocab';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const { sourceTextId } = req.body as { sourceTextId?: string };
  if (!sourceTextId) {
    return res.status(400).json({ error: 'Missing sourceTextId' });
  }

  try {
    const result = await extractVocab(sourceTextId);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
