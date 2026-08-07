import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { rows } = await query(
        `select cu.id, cu.name, cu.sort_order,
                count(ci.id) filter (where ci.status = 'approved') as item_count
         from content_units cu
         left join content_items ci on ci.unit_id = cu.id and ci.item_type = 'word'
         where cu.module = 'vocabulary'
         group by cu.id, cu.name, cu.sort_order
         order by cu.sort_order`,
      );
      return res.status(200).json(rows);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use GET or POST' });
  }

  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Missing name' });
  }

  try {
    const { rows: maxSortRows } = await query(
      `select coalesce(max(sort_order), -1) as max_sort from content_units where module = 'vocabulary'`,
    );
    const nextSortOrder = maxSortRows[0].max_sort + 1;

    const { rows } = await query(
      `insert into content_units (name, module, unit_type, sort_order)
       values ($1, 'vocabulary', 'words', $2)
       returning id, name, sort_order`,
      [name.trim(), nextSortOrder],
    );

    res.status(200).json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
