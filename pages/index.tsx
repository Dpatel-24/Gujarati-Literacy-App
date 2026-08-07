import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { query } from '@/lib/db';

interface UnitSummary {
  unitId: string;
  name: string;
  unitType: string;
  totalItems: number;
  proficiencyPercent: number;
  dueCount: number;
  newCount: number;
}

interface HomeProps {
  units: UnitSummary[];
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  // One query per unit's stats via a left-join chain:
  //   content_units -> content_items (approved only) -> item_progress
  // A unit with zero approved items produces one all-null row via the
  // left joins, so new_count/due_count/proficient_count are guarded
  // with "ci.id is not null" where needed to avoid counting a
  // non-existent item as "new".
  const { rows } = await query(`
    select
      cu.id as unit_id,
      cu.name,
      cu.unit_type,
      count(ci.id) as total_items,
      count(*) filter (where ci.id is not null and ip.box_level >= 3) as proficient_count,
      count(*) filter (where ip.id is not null and ip.next_review_date <= current_date) as due_count,
      count(*) filter (where ci.id is not null and ip.id is null) as new_count
    from content_units cu
    left join content_items ci on ci.unit_id = cu.id and ci.status = 'approved'
    left join item_progress ip on ip.content_item_id = ci.id
    group by cu.id, cu.name, cu.unit_type, cu.sort_order
    order by cu.sort_order
  `);

  const units: UnitSummary[] = rows.map((row: any) => {
    const totalItems = Number(row.total_items);
    const proficientCount = Number(row.proficient_count);
    const proficiencyPercent = totalItems === 0 ? 0 : Math.round((proficientCount / totalItems) * 100);

    return {
      unitId: row.unit_id,
      name: row.name,
      unitType: row.unit_type,
      totalItems,
      proficiencyPercent,
      dueCount: Number(row.due_count),
      newCount: Number(row.new_count),
    };
  });

  return { props: { units } };
};

export default function Home({ units }: HomeProps) {
  return (
    <>
      <Head>
        <title>Gujarati Literacy App</title>
        <meta name="description" content="Personal Gujarati literacy app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 800 }}>
        <h1>Gujarati Literacy</h1>

        <div style={{ margin: '1.5rem 0' }}>
          <Link href="/review" style={{ padding: '0.5rem 1.5rem', border: '1px solid #333', borderRadius: 4 }}>
            Review due items
          </Link>
        </div>

        <h2>Chapters</h2>

        {units.length === 0 && <p>No chapters yet.</p>}

        {units.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {units.map((unit) => (
              <div
                key={unit.unitId}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{unit.name}</div>
                  <div style={{ color: '#555', fontSize: '0.9rem' }}>
                    {unit.totalItems} item{unit.totalItems === 1 ? '' : 's'} · {unit.proficiencyPercent}% proficient ·{' '}
                    {unit.dueCount} due · {unit.newCount} new
                  </div>
                </div>
                <Link
                  href={`/lesson/${unit.unitId}`}
                  style={{ padding: '0.5rem 1.5rem', border: '1px solid #333', borderRadius: 4 }}
                >
                  Start
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
