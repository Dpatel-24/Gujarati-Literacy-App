import { useEffect, useState } from 'react';
import styles from '@/styles/AdminForm.module.css';

interface VocabCandidate {
  id: string;
  word_gujarati: string;
  word_phonetic: string;
  frequency_count: number;
  gloss_draft: string | null;
  status: string;
  source_text_ids: string[];
  promoted_content_item_id: string | null;
  created_at: string;
}

/**
 * Admin page for reviewing draft vocab_candidates: approve promotes a
 * word into an approved content_items row with no chapter yet
 * (unit_id null -- chapter assignment happens in a separate screen).
 * The word still carries source_text_id so where it came from isn't
 * lost; that's just shown once here at approval time, not persisted
 * as a chapter tag. Reject marks the candidate rejected. Both remove
 * the row from this list immediately.
 */
export default function ReviewVocab() {
  const [rows, setRows] = useState<VocabCandidate[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastApproved, setLastApproved] = useState<{ word: string; sourceTextTitle: string | null } | null>(
    null,
  );

  async function loadRows() {
    setListError(null);
    try {
      const res = await fetch('/api/vocab-candidates');
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? 'Failed to load vocab candidates');
        return;
      }
      setRows(data);
    } catch (err: any) {
      setListError(err.message);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  async function handleApprove(id: string, word: string) {
    setBusyId(id);
    setActionError(null);
    setLastApproved(null);
    try {
      const res = await fetch('/api/vocab-candidates/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? 'Approve failed');
        return;
      }
      setLastApproved({ word, sourceTextTitle: data.sourceTextTitle });
      setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch('/api/vocab-candidates/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? 'Reject failed');
        return;
      }
      setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Review Vocabulary</h1>
      <p className={styles.subheading}>
        Draft words extracted from source texts. Approve promotes a word into content_items with no chapter
        assigned yet; reject discards it.
      </p>

      {listError && <p className={styles.errorText}>{listError}</p>}
      {actionError && <p className={styles.errorText}>{actionError}</p>}
      {lastApproved && (
        <p className={styles.successText}>
          Approved &quot;{lastApproved.word}&quot;
          {lastApproved.sourceTextTitle ? ` — from "${lastApproved.sourceTextTitle}"` : ''}. Unassigned to a
          chapter for now.
        </p>
      )}

      {!rows && !listError && <p className={styles.subheading}>Loading…</p>}
      {rows && rows.length === 0 && <p className={styles.emptyText}>No draft candidates left to review.</p>}

      {rows && rows.length > 0 && (
        <div className={styles.candidateList}>
          {rows.map((r) => (
            <div key={r.id} className={styles.candidateRow}>
              <div className={styles.candidateMain}>
                <span className={styles.candidateGujarati}>{r.word_gujarati}</span>
                <span className={styles.candidatePhonetic}>{r.word_phonetic}</span>
                <span className={styles.candidateGloss}>{r.gloss_draft ?? '—'}</span>
                <span className={styles.candidateFreq}>×{r.frequency_count}</span>
              </div>
              <div className={styles.candidateActions}>
                <button
                  onClick={() => handleApprove(r.id, r.word_gujarati)}
                  disabled={busyId === r.id}
                  className={styles.approveButton}
                >
                  {busyId === r.id ? 'Working…' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(r.id)}
                  disabled={busyId === r.id}
                  className={styles.rejectButton}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
