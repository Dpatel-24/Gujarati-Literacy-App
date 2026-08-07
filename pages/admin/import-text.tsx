import { useState, type FormEvent } from 'react';

interface SuccessResult {
  id: string;
  stanzaCount: number;
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
 * Admin-only tool for pasting source material (Gujarati + phonetic
 * transliteration, line-aligned) into a source_texts row. No auto-align
 * on mismatched line counts — that's a correctness risk, so a mismatch
 * blocks submission until the user fixes it.
 */
export default function ImportText() {
  const [title, setTitle] = useState('');
  const [gujaratiText, setGujaratiText] = useState('');
  const [phoneticText, setPhoneticText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SuccessResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractVocabResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const gujaratiLines = gujaratiText.split('\n');
    const phoneticLines = phoneticText.split('\n');

    if (gujaratiLines.length !== phoneticLines.length) {
      const moreSide = gujaratiLines.length > phoneticLines.length ? 'Gujarati' : 'Phonetic';
      setError(
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
        setError(data.error ?? 'Insert failed');
        return;
      }
      setResult(data);
      setTitle('');
      setGujaratiText('');
      setPhoneticText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExtractVocab() {
    if (!result) return;
    setExtracting(true);
    setExtractError(null);
    setExtractResult(null);
    try {
      const res = await fetch('/api/extract-vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTextId: result.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error ?? 'Extraction failed');
        return;
      }
      setExtractResult(data);
    } catch (err: any) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 900 }}>
      <h1>Import Source Text</h1>

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
            rows={16}
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
            rows={16}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1.1rem' }}
          />
        </div>

        <button type="submit" disabled={submitting} style={{ padding: '0.5rem 1.5rem', fontSize: '1rem' }}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {error && (
        <p style={{ color: 'crimson', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{error}</p>
      )}

      {result && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: 'green' }}>
            Saved. source_texts.id = <code>{result.id}</code>, stanza count = {result.stanzaCount}
          </p>
          <button
            onClick={handleExtractVocab}
            disabled={extracting}
            style={{ padding: '0.5rem 1.5rem', fontSize: '1rem' }}
          >
            {extracting ? 'Extracting vocabulary...' : 'Extract vocabulary now'}
          </button>
        </div>
      )}

      {extractError && (
        <p style={{ color: 'crimson', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{extractError}</p>
      )}

      {extractResult && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: 'green' }}>
            Extracted. {extractResult.newWordsInserted} new word(s) inserted,{' '}
            {extractResult.existingWordsBumped} existing draft(s) bumped,{' '}
            {extractResult.skippedLines.length} line(s) skipped.
          </p>

          {extractResult.skippedLines.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Skipped lines:</strong>
              <ul>
                {extractResult.skippedLines.map((s, i) => (
                  <li key={i}>
                    Line {s.lineIndex}: {s.reason} — &quot;{s.gujarati}&quot; / &quot;{s.phonetic}&quot;
                  </li>
                ))}
              </ul>
            </div>
          )}

          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Gujarati</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Phonetic</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Frequency</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>Gloss</th>
                <th style={{ border: '1px solid #ccc', padding: '0.4rem', textAlign: 'left' }}>New?</th>
              </tr>
            </thead>
            <tbody>
              {extractResult.words.map((w, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontSize: '1.1rem' }}>{w.gujarati}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{w.phonetic}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{w.frequency}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{w.gloss ?? '(unchanged)'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{w.wasNew ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
