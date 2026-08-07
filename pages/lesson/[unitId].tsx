import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { query } from '@/lib/db';
import LessonSession, { type ContentItem, type LessonSessionMode } from '@/components/LessonSession';
import styles from '@/styles/PageShell.module.css';

const SESSION_SIZE_CAP = 20;

interface LessonPageProps {
  unitId: string;
  unitName: string | null;
  items: ContentItem[];
}

export const getServerSideProps: GetServerSideProps<LessonPageProps> = async (context) => {
  const unitId = context.params?.unitId as string;

  const { rows: unitRows } = await query(`select name from content_units where id = $1`, [unitId]);
  const unitName = unitRows[0]?.name ?? null;

  // Priority order: due items (have a progress row, next_review_date
  // in the past or today) first, then never-studied items (no
  // progress row at all), then not-yet-due items last (soonest first
  // within that group). Capped so a big chapter doesn't become a
  // 200-item marathon in one sitting. Same queue for both study and
  // quiz mode -- mode only changes what happens per item.
  const { rows } = await query(
    `select ci.id, ci.gujarati_text, ci.phonetic_text, ci.meaning, ci.item_type, ci.unit_id
     from content_items ci
     left join item_progress ip on ip.content_item_id = ci.id
     where ci.unit_id = $1 and ci.status = 'approved'
     order by
       case
         when ip.id is not null and ip.next_review_date <= current_date then 0
         when ip.id is null then 1
         else 2
       end,
       ip.next_review_date asc nulls last
     limit $2`,
    [unitId, SESSION_SIZE_CAP],
  );

  return { props: { unitId, unitName, items: rows } };
};

export default function LessonPage({ unitName, items }: LessonPageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<LessonSessionMode | null>(null);

  function handleComplete() {
    router.push('/');
  }

  return (
    <>
      <Head>
        <title>{unitName ? `Lesson: ${unitName}` : 'Lesson'}</title>
      </Head>
      <main className={styles.page}>
        {items.length === 0 ? (
          <div>
            <h1 className={`text-page-heading ${styles.pageHeading}`}>{unitName ?? 'Lesson'}</h1>
            <div className={styles.emptyLeaf}>
              <p className={styles.emptyMessage}>Nothing to study here right now.</p>
              <Link href="/" className={styles.backLink}>
                Back to home
              </Link>
            </div>
          </div>
        ) : mode === null ? (
          <div>
            <h1 className={`text-page-heading ${styles.pageHeading}`}>{unitName ?? 'Lesson'}</h1>
            <div className={styles.modeLeaf}>
              <div className={styles.modeTitle}>{unitName ?? 'Lesson'}</div>
              <div className={styles.modeMeta}>
                {items.length} item{items.length === 1 ? '' : 's'} in this session
              </div>
              <div className={styles.modeButtons}>
                <button onClick={() => setMode('study')} className={styles.modeButton}>
                  Study
                </button>
                <button onClick={() => setMode('quiz')} className={`${styles.modeButton} ${styles.modeButtonQuiz}`}>
                  Quiz me
                </button>
              </div>
            </div>
          </div>
        ) : (
          <LessonSession items={items} mode={mode} onComplete={handleComplete} />
        )}
      </main>
    </>
  );
}
