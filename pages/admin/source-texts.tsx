import { Fragment, useEffect, useState, type FormEvent } from 'react';

interface SourceTextRow {
  id: string;
  title: string;
  stanza_count: number;
  created_at: string;
  extracted_at: string | null;
}

interface ExtractVocabWord {
  gujarati: string;
  phonetic: string;
  frequency: number;
  gloss: string | null;
  wasNew: boolean;
}

interface ExtractVocabResult {
  sourceTextId: string;
  skippedLines: Array<{ lineIndex: number; reason: string; gujarati: string; phonetic: string }>;
  newWordsInserted: number;
  existingWordsBumped: number;
  words: ExtractVocabWord[];
}

/**
 * Admin page for source texts: submit a new one (title + line-aligned
 * Gujarati/phonetic textareas), and browse everything already in the
 * database with its extraction status. Rows not yet extracted get an
 * "Extract vocabulary" action inline.
 */
export default function SourceTexts() {
  const [rows, setRows] = useState<SourceTextRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [gujaratiText, setGujaratiText] = useState('');
  const [phoneticText, setPhoneticText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{ id: string; stanzaCount: number } | null>(null);

  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractResults, setExtractResults] = useState<Record<string, ExtractVocabResult>>({});

  async function loadRows() {
    setListError(null);
    try {
      const res = await fetch('/api/source-texts');
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error ?? 'Failed to load source texts');
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitSuccess(null);

    const gujaratiLines = gujaratiText.split('\n');
    const phoneticLines = phoneticText.split('\n');

    if (gujaratiLines.length !== phoneticLines.length) {
      const moreSide = gujaratiLines.length > phoneticLines.length ? 'Gujarati' : 'Phonetic';
      setFormError(
        `Line count mismatch: Gujarati has ${gujaratiLines.length} line(s), ` +
          `Phonetic has ${phoneticLines.length} line(s). ${moreSide} has more. ` +
          `Fix the line alignment and try again.`,
      );
      return;
    }

    const stanzaPairs = gujaratiLines.map((gujarati, i) => ({
      gujarati,
      phonetic: phoneticLines[i],
    }));

    setSubmitting(true);
    try {
      const res = await fetch('/api/source-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          gujaratiRaw: gujaratiText,
          phoneticRaw: phoneticText,
          stanzaPairs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Insert failed');
        return;
      }
      setSubmitSuccess(data);
      setTitle('');
      setGujaratiText('');
      setPhoneticText('');
      loadRows();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExtract(sourceTextId: string) {
    setExtractingId(sourceTextId);
    setExtractError(null);
    try {
      const res = await fetch('/api/extract-vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTextId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error ?? 'Extraction failed');
        return;
      }
      setExtractResults((prev) => ({ ...prev, [sourceTextId]: data }));
      loadRows();
    } catch (err: any) {
      setExtractError(err.message);
    } finally {
      setExtractingId(null);
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 1000 }}>
      <h1>Source Texts</h1>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2>Import new</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="title" style={{ display: 'block', fontWeight: 'bold' }}>
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="gujarati" style={{ display: 'block', fontWeight: 'bold' }}>
              Gujarati text (one line per stanza/line)
            </label>
            <textarea
              id="gujarati"
              value={gujaratiText}
              onChange={(e) => setGujaratiText(e.target.value)}
              required
              rows={12}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1.1rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="phonetic" style={{ display: 'block', fontWeight: 'bold' }}>
              Phonetic text (same line order as Gujarati above)
            </label>
            <textarea
              id="phonetic"
              value={phoneticText}
              onChange={(e) => setPhoneticText(e.target.value)}
              required
              rows={12}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1.1rem' }}
            />
          </div>

          <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', fontSize: '1rem' }}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>

        {formError && (
          <p style={{ color: 'crimson', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{formError}</p>
        )}
        {submitSuccess && (
          <p style={{ color: 'green', marginTop: '1rem' }}>
            Saved. id = <code>{submitSuccess.id}</code>, stanza count = {submitSuccess.stanzaCount}
          </p>
        )}
      </section>

      <section>
        <h2>All source texts</h2>

        {listError && <p style={{ color: 'crimson' }}>{listError}</p>}
        {extractError && <p style={{ color: 'crimson' }}>{extractError}</p>}
        {!rows && !listError && <p>Loading…</p>}
        {rows && rows.length === 0 && <p>No source texts yet.</p>}

        {rows && rows.length > 0 && (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Title</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Stanzas</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Created</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Extraction status</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isExtracted = r.extracted_at !== null;
                const isExtracting = extractingId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr>
                      <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{r.title}</td>
                      <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{r.stanza_count}</td>
                      <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>
                        {isExtracted ? (
                          <span style={{ color: 'green' }}>
                            Extracted {new Date(r.extracted_at as string).toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: '#999' }}>Not extracted</span>
                        )}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>
                        <button
                          onClick={() => handleExtract(r.id)}
                          disabled={isExtracting}
                          style={{ padding: '0.3rem 0.8rem' }}
                        >
                          {isExtracting
                            ? 'Extracting...'
                            : isExtracted
                              ? 'Re-extract'
                              : 'Extract vocabulary'}
                        </button>
                      </td>
                    </tr>
                    {extractResults[r.id] && (
                      <tr>
                        <td colSpan={5} style={{ border: '1px solid #ccc', padding: '0.6rem', background: '#fafafa' }}>
                          <div style={{ marginBottom: '0.5rem' }}>
                            {extractResults[r.id].newWordsInserted} new word(s),{' '}
                            {extractResults[r.id].existingWordsBumped} bumped,{' '}
                            {extractResults[r.id].skippedLines.length} line(s) skipped.
                          </div>
                          {extractResults[r.id].words.length > 0 && (
                            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ border: '1px solid #ddd', padding: '0.3rem', textAlign: 'left' }}>Gujarati</th>
                                  <th style={{ border: '1px solid #ddd', padding: '0.3rem', textAlign: 'left' }}>Phonetic</th>
                                  <th style={{ border: '1px solid #ddd', padding: '0.3rem', textAlign: 'left' }}>Freq</th>
                                  <th style={{ border: '1px solid #ddd', padding: '0.3rem', textAlign: 'left' }}>Gloss</th>
                                </tr>
                              </thead>
                              <tbody>
                                {extractResults[r.id].words.map((w, i) => (
                                  <tr key={i}>
                                    <td style={{ border: '1px solid #ddd', padding: '0.3rem', fontSize: '1.05rem' }}>{w.gujarati}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '0.3rem' }}>{w.phonetic}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '0.3rem' }}>{w.frequency}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '0.3rem' }}>{w.gloss ?? '(unchanged)'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
