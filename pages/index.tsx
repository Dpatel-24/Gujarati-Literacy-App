import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { query } from '@/lib/db';
import styles from '@/styles/Home.module.css';

interface UnitSummary {
  unitId: string;
  name: string;
  unitType: string;
  totalItems: number;
  proficiencyPercent: number;
  dueCount: number;
  newCount: number;
  sampleGlyphs: string[];
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
  const [{ rows: statRows }, { rows: sampleRows }] = await Promise.all([
    query(`
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
    `),
    // Up to 2 sample glyphs per unit, as a quiet visual identifier on
    // its leaf -- earliest-added approved items, not random, so the
    // sample is stable between page loads.
    query(`
      select unit_id, gujarati_text from (
        select ci.unit_id, ci.gujarati_text,
               row_number() over (partition by ci.unit_id order by ci.created_at) as rn
        from content_items ci
        where ci.status = 'approved'
      ) ranked
      where rn <= 2
    `),
  ]);

  const samplesByUnit = new Map<string, string[]>();
  for (const row of sampleRows) {
    const list = samplesByUnit.get(row.unit_id) ?? [];
    list.push(row.gujarati_text);
    samplesByUnit.set(row.unit_id, list);
  }

  const units: UnitSummary[] = statRows.map((row: any) => {
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
      sampleGlyphs: samplesByUnit.get(row.unit_id) ?? [],
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
      <main className={styles.page}>
        <h1 className={`text-page-heading ${styles.pageHeading}`}>Chapters</h1>

        <Link href="/review" className={styles.reviewLink}>
          Review due items
        </Link>

        {units.length === 0 && <p className={`text-body ${styles.emptyState}`}>No chapters yet.</p>}

        {units.length > 0 && (
          <div className={styles.leafList}>
            {units.map((unit) => (
              <div key={unit.unitId} className={styles.leaf}>
                <div className={styles.leafMain}>
                  <span className={`text-heading ${styles.leafName}`}>{unit.name}</span>
                  {unit.sampleGlyphs.length > 0 && (
                    <span className={styles.leafSample}>{unit.sampleGlyphs.join(' ')}</span>
                  )}
                </div>

                <div>
                  <div className={styles.leafStats}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${unit.proficiencyPercent}%` }} />
                    </div>
                    <span className={`text-small ${styles.barLabel}`}>{unit.proficiencyPercent}% proficient</span>
                  </div>
                  <div className={styles.leafStats}>
                    <span className={`text-small ${styles.metaText}`}>
                      {unit.totalItems} item{unit.totalItems === 1 ? '' : 's'} · {unit.dueCount} due ·{' '}
                      {unit.newCount} new
                    </span>
                  </div>
                </div>

                <Link href={`/lesson/${unit.unitId}`} className={`text-body ${styles.startButton}`}>
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
