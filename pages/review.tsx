import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { query } from '@/lib/db';
import LessonSession, { type ContentItem } from '@/components/LessonSession';

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

  return { props: { items: rows } };
};

export default function ReviewPage({ items }: ReviewPageProps) {
  const router = useRouter();

  function handleComplete() {
    router.push('/');
  }

  return (
    <>
      <Head>
        <title>Review</title>
      </Head>
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        {items.length === 0 ? (
          <div>
            <h1>Review</h1>
            <p>Nothing due for review right now.</p>
            <Link href="/">Back to home</Link>
          </div>
        ) : (
          <LessonSession items={items} onComplete={handleComplete} />
        )}
      </main>
    </>
  );
}
