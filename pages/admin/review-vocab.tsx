import { useEffect, useState } from 'react';

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
 * word into content_items (grouped into a content_units row named
 * after its source text, item_type 'words'), reject marks it rejected.
 * Both remove the row from this list immediately.
 */
export default function ReviewVocab() {
  const [rows, setRows] = useState<VocabCandidate[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastApproved, setLastApproved] = useState<{ word: string; unitName: string } | null>(null);

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
      setLastApproved({ word, unitName: data.unitName });
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
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 1000, color: '#111' }}>
      <h1>Review Vocabulary</h1>
      <p>Draft words extracted from source texts. Approve promotes a word into content_items.</p>

      {listError && <p style={{ color: 'crimson' }}>{listError}</p>}
      {actionError && <p style={{ color: 'crimson' }}>{actionError}</p>}
      {lastApproved && (
        <p style={{ color: 'green' }}>
          Approved &quot;{lastApproved.word}&quot; into unit &quot;{lastApproved.unitName}&quot;.
        </p>
      )}

      {!rows && !listError && <p>Loading…</p>}
      {rows && rows.length === 0 && <p>No draft candidates left to review.</p>}

      {rows && rows.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%', background: '#fff' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Gujarati</th>
              <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Phonetic</th>
              <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Freq</th>
              <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Gloss (draft)</th>
              <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontSize: '1.1rem' }}>{r.word_gujarati}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{r.word_phonetic}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{r.frequency_count}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{r.gloss_draft ?? '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>
                  <button
                    onClick={() => handleApprove(r.id, r.word_gujarati)}
                    disabled={busyId === r.id}
                    style={{ marginRight: '0.5rem', padding: '0.3rem 0.8rem' }}
                  >
                    {busyId === r.id ? 'Working…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(r.id)}
                    disabled={busyId === r.id}
                    style={{ padding: '0.3rem 0.8rem' }}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
