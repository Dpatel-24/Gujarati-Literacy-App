import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { query } from '@/lib/db';
import LessonSession, { type ContentItem } from '@/components/LessonSession';

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
  // 200-item marathon in one sitting.
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

  function handleComplete() {
    router.push('/');
  }

  return (
    <>
      <Head>
        <title>{unitName ? `Lesson: ${unitName}` : 'Lesson'}</title>
      </Head>
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        {items.length === 0 ? (
          <div>
            <h1>{unitName ?? 'Lesson'}</h1>
            <p>Nothing to study here right now — no due or new items in this chapter.</p>
            <Link href="/">Back to home</Link>
          </div>
        ) : (
          <LessonSession items={items} onComplete={handleComplete} />
        )}
      </main>
    </>
  );
}
