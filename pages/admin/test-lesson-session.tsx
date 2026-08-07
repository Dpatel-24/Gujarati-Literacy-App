import { useEffect, useState } from 'react';
import LessonSession, { type ContentItem, type LessonSessionMode } from '@/components/LessonSession';

/**
 * Temporary isolated test harness for LessonSession: fetches a small
 * batch of real approved content_items and hands them straight to the
 * component, with a mode picker so both 'study' and 'quiz' can be
 * exercised independently. Safe to delete once LessonSession is
 * trusted and wired into a real page.
 */
export default function TestLessonSession() {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LessonSessionMode | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/test-lesson-session-items')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setItems(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p style={{ color: 'crimson', padding: '2rem' }}>{error}</p>;
  if (!items) return <p style={{ padding: '2rem' }}>Loading…</p>;
  if (done) return <p style={{ padding: '2rem', color: 'green' }}>Session complete (onComplete fired).</p>;

  if (mode === null) {
    return (
      <main style={{ padding: '2rem' }}>
        <button onClick={() => setMode('study')} style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}>
          Study mode
        </button>
        <button onClick={() => setMode('quiz')} style={{ padding: '0.5rem 1rem' }}>
          Quiz mode
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem' }}>
      <LessonSession items={items} mode={mode} onComplete={() => setDone(true)} />
    </main>
  );
}
