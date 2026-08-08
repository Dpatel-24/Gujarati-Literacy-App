import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { query } from '@/lib/db';
import styles from '@/styles/Home.module.css';

interface UnitSummary {
  unitId: string;
  name: string;
  module: string;
  totalItems: number;
  proficiencyPercent: number;
  dueCount: number;
  newCount: number;
  sampleGlyphs: string[];
}

interface HomeProps {
  lettersUnits: UnitSummary[];
  textUnits: UnitSummary[];
  vocabularyUnits: UnitSummary[];
  unassignedWordCount: number;
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  // One query per unit's stats via a left-join chain:
  //   content_units -> content_items (approved only) -> item_progress
  // A unit with zero approved items (true for every module 'text'
  // unit right now, and for freshly-created vocabulary groups)
  // produces one all-null row via the left joins, so
  // new_count/due_count/proficient_count are guarded with
  // "ci.id is not null" where needed.
  const [{ rows: statRows }, { rows: sampleRows }, { rows: unassignedRows }] = await Promise.all([
    query(`
      select
        cu.id as unit_id,
        cu.name,
        cu.module,
        count(ci.id) as total_items,
        count(*) filter (where ci.id is not null and ip.box_level >= 3) as proficient_count,
        count(*) filter (where ip.id is not null and ip.next_review_date <= current_date) as due_count,
        count(*) filter (where ci.id is not null and ip.id is null) as new_count
      from content_units cu
      left join content_items ci on ci.unit_id = cu.id and ci.status = 'approved'
      left join item_progress ip on ip.content_item_id = ci.id
      group by cu.id, cu.name, cu.module, cu.sort_order
      order by cu.sort_order
    `),
    // Up to 2 sample glyphs per unit, as a quiet visual identifier on
    // Letters rows -- earliest-added approved items, not random, so
    // the sample is stable between page loads.
    query(`
      select unit_id, gujarati_text from (
        select ci.unit_id, ci.gujarati_text,
               row_number() over (partition by ci.unit_id order by ci.created_at) as rn
        from content_items ci
        where ci.status = 'approved'
      ) ranked
      where rn <= 2
    `),
    query(
      `select count(*) as n from content_items where item_type = 'word' and unit_id is null and status = 'approved'`,
    ),
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
      module: row.module,
      totalItems,
      proficiencyPercent,
      dueCount: Number(row.due_count),
      newCount: Number(row.new_count),
      sampleGlyphs: samplesByUnit.get(row.unit_id) ?? [],
    };
  });

  return {
    props: {
      lettersUnits: units.filter((u) => u.module === 'letters'),
      textUnits: units.filter((u) => u.module === 'text'),
      vocabularyUnits: units.filter((u) => u.module === 'vocabulary'),
      unassignedWordCount: Number(unassignedRows[0].n),
    },
  };
};

function LettersRow({ unit }: { unit: UnitSummary }) {
  return (
    <div className={styles.lettersBlock}>
      <div className={styles.lettersMain}>
        <span className={styles.lettersName}>{unit.name}</span>
        {unit.sampleGlyphs.length > 0 && <span className={styles.lettersSample}>{unit.sampleGlyphs.join(' ')}</span>}
      </div>

      <div>
        <div className={styles.lettersStats}>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${unit.proficiencyPercent}%` }} />
          </div>
          <span className={`text-small ${styles.barLabel}`}>{unit.proficiencyPercent}% proficient</span>
        </div>
        <span className={`text-small ${styles.metaText}`}>
          {unit.dueCount} due · {unit.newCount} new
        </span>
      </div>

      <Link href={`/lesson/${unit.unitId}`} className={styles.lettersStart}>
        Start
      </Link>
    </div>
  );
}

export default function Home({ lettersUnits, textUnits, vocabularyUnits, unassignedWordCount }: HomeProps) {
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

        <div className={styles.moduleSection}>
          <div className={styles.indexHeading}>Letters</div>
          {lettersUnits.length === 0 ? (
            <p className={styles.indexEmpty}>No letter units yet.</p>
          ) : (
            <div className={styles.lettersRows}>
              {lettersUnits.map((unit) => (
                <LettersRow key={unit.unitId} unit={unit} />
              ))}
            </div>
          )}
        </div>

        <Link href="/review" className={styles.reviewCta}>
          Review due items
        </Link>

        <div className={styles.moduleSection}>
          <div className={styles.indexHeading}>Text</div>
          {textUnits.length === 0 ? (
            <p className={styles.indexEmpty}>No texts imported yet.</p>
          ) : (
            <div className={styles.indexList}>
              {textUnits.map((unit) => (
                <div key={unit.unitId} className={styles.indexRowMuted}>
                  <span className={styles.indexNameMuted}>{unit.name}</span>
                  <span className={styles.comingSoon}>Coming soon</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.moduleSection}>
          <div className={styles.indexHeading}>Vocabulary</div>
          {vocabularyUnits.length === 0 ? (
            <p className={styles.indexEmpty}>No vocabulary groups yet.</p>
          ) : (
            <div className={styles.indexList}>
              {vocabularyUnits.map((unit) => (
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

          {unassignedWordCount > 0 && (
            <Link href="/admin/vocab-groups" className={styles.unassignedCallout}>
              {unassignedWordCount} word{unassignedWordCount === 1 ? '' : 's'} waiting to be grouped
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
