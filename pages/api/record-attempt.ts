import type { NextApiRequest, NextApiResponse } from 'next';
import { recordAttempt } from '@/lib/leitner';

/**
 * recordAttempt() talks to Postgres directly, so it can't run in the
 * browser — this route is the client-safe entry point LessonSession
 * calls after each quiz answer.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const { contentItemId, wasCorrect } = req.body as { contentItemId?: string; wasCorrect?: boolean };
  if (!contentItemId || typeof wasCorrect !== 'boolean') {
    return res.status(400).json({ error: 'Missing contentItemId or wasCorrect' });
  }

  try {
    const result = await recordAttempt(contentItemId, wasCorrect);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
