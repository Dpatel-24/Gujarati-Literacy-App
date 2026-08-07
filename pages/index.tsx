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
    // Up to 2 sample glyphs per unit, as a quiet visual identifier --
    // earliest-added approved items, not random, so the sample is
    // stable between page loads.
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
  // Letters is front matter -- the foundational chapter, rendered as
  // its own larger block. Everything else (unit_type 'words', one per
  // imported source text) forms the table-of-contents index below it.
  const lettersUnit = units.find((u) => u.unitType === 'letters') ?? null;
  const wordChapters = units.filter((u) => u.unitType !== 'letters');

  return (
    <>
      <Head>
        <title>Gujarati Literacy</title>
        <meta name="description" content="Personal Gujarati literacy app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.ornament}>ૐ</div>
          <div className={styles.eyebrow}>Gujarati reading practice</div>
          <h1 className={styles.title}>Gujarati Literacy</h1>
        </div>
        <hr className={styles.headerRule} />

        {lettersUnit && (
          <div className={styles.lettersSection}>
            <div className={styles.lettersBlock}>
              <div className={styles.lettersMain}>
                <span className={styles.lettersName}>{lettersUnit.name}</span>
                {lettersUnit.sampleGlyphs.length > 0 && (
                  <span className={styles.lettersSample}>{lettersUnit.sampleGlyphs.join(' ')}</span>
                )}
              </div>

              <div>
                <div className={styles.lettersStats}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${lettersUnit.proficiencyPercent}%` }} />
                  </div>
                  <span className={`text-small ${styles.barLabel}`}>{lettersUnit.proficiencyPercent}% proficient</span>
                </div>
                <span className={`text-small ${styles.metaText}`}>
                  {lettersUnit.dueCount} due · {lettersUnit.newCount} new
                </span>
              </div>

              <Link href={`/lesson/${lettersUnit.unitId}`} className={styles.lettersStart}>
                Start
              </Link>
            </div>
          </div>
        )}

        <Link href="/review" className={styles.reviewCta}>
          Review due items
        </Link>

        <div>
          <div className={styles.indexHeading}>Texts</div>

          {wordChapters.length === 0 ? (
            <p className={styles.indexEmpty}>No texts imported yet.</p>
          ) : (
            <div className={styles.indexList}>
              {wordChapters.map((unit) => (
                <Link key={unit.unitId} href={`/lesson/${unit.unitId}`} className={styles.indexRow}>
                  <span className={styles.indexName}>{unit.name}</span>
                  <span className={styles.indexLeader} />
                  <span className={styles.indexStats}>
                    {unit.proficiencyPercent}% · {unit.dueCount} due · {unit.newCount} new
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
