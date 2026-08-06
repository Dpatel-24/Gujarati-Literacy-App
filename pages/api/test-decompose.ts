import type { NextApiRequest, NextApiResponse } from 'next';
import { decompose } from '@/lib/gujarati-script';

/**
 * Temporary manual-verification route for decompose(). Not wired into
 * any UI — hit /api/test-decompose directly and eyeball the output.
 * Safe to delete once decompose() is trusted.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cases = [
    { label: 'bare consonant "ka"', input: 'ક' },
    { label: 'ka + aa matra', input: 'કા' },
    { label: 'ka + i matra', input: 'કિ' },
    { label: 'kha + u matra + anusvara', input: 'ખું' },
    { label: 'bare independent vowel', input: 'અ' },
  ];

  const results = cases.map(({ label, input }) => ({
    label,
    input,
    output: decompose(input),
  }));

  res.status(200).json(results);
}
