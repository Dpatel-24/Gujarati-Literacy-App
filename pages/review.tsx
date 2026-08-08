import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { query } from '@/lib/db';
import { shuffle } from '@/lib/shuffle';
import LessonSession, { type ContentItem, type LessonSessionMode } from '@/components/LessonSession';
import styles from '@/styles/PageShell.module.css';

const SESSION_SIZE_CAP = 20;

interface ReviewPageProps {
  items: ContentItem[];
}

export const getServerSideProps: GetServerSideProps<ReviewPageProps> = async () => {
  const { rows } = await query(
    `select ci.id, ci.gujarati_text, ci.phonetic_text, ci.meaning, ci.item_type, ci.unit_id
     from item_progress ip
     join content_items ci on ci.id = ip.content_item_id
     where ip.next_review_date <= current_date and ci.status = 'approved'
     order by ip.next_review_date asc
     limit $1`,
    [SESSION_SIZE_CAP],
  );

  // Priority order above (most-overdue first) is what decides *which*
  // items make the cut; shuffle afterward is presentation order only.
  return { props: { items: shuffle(rows) } };
};

export default function ReviewPage({ items }: ReviewPageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<LessonSessionMode | null>(null);

  function handleComplete() {
    router.push('/');
  }

  return (
    <>
      <Head>
        <title>Review</title>
      </Head>
      <main className={styles.page}>
        {items.length === 0 ? (
          <div>
            <h1 className={`text-page-heading ${styles.pageHeading}`}>Review</h1>
            <div className={styles.emptyLeaf}>
              <p className={styles.emptyMessage}>Nothing due right now.</p>
              <Link href="/" className={styles.backLink}>
                Back to home
              </Link>
            </div>
          </div>
        ) : mode === null ? (
          <div>
            <h1 className={`text-page-heading ${styles.pageHeading}`}>Review</h1>
            <div className={styles.modeLeaf}>
              <div className={styles.modeTitle}>Due for review</div>
              <div className={styles.modeMeta}>
                {items.length} item{items.length === 1 ? '' : 's'} due
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
