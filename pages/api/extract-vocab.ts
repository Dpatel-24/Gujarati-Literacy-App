import type { NextApiRequest, NextApiResponse } from 'next';
import { extractVocab } from '@/lib/extract-vocab';

// Rate-limit backoff can mean this run takes a while (each retry can
// wait up to 60s). Give the function the most headroom Vercel's Hobby
// tier allows so a slow-but-fine run doesn't get killed as a timeout.
export const config = {
  maxDuration: 60,
};

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
