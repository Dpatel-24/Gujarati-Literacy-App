import { useState, type FormEvent } from 'react';
import styles from '@/styles/AdminForm.module.css';

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
    <main className={styles.page}>
      <h1 className={styles.heading}>Import Source Text</h1>
      <p className={styles.subheading}>
        Paste Gujarati text and its phonetic transliteration, one line per stanza/line, in the same order on
        both sides.
      </p>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.label}>
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="gujarati" className={styles.label}>
            Gujarati text (one line per stanza/line)
          </label>
          <textarea
            id="gujarati"
            value={gujaratiText}
            onChange={(e) => setGujaratiText(e.target.value)}
            required
            rows={16}
            className={styles.textarea}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phonetic" className={styles.label}>
            Phonetic text (same line order as Gujarati above)
          </label>
          <textarea
            id="phonetic"
            value={phoneticText}
            onChange={(e) => setPhoneticText(e.target.value)}
            required
            rows={16}
            className={styles.textarea}
          />
        </div>

        <button type="submit" disabled={submitting} className={styles.primaryButton}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {error && <p className={styles.errorText}>{error}</p>}

      {result && (
        <div className={styles.resultBlock}>
          <p className={styles.successText}>
            Saved. source_texts.id = <code>{result.id}</code>, stanza count = {result.stanzaCount}
          </p>
          <button onClick={handleExtractVocab} disabled={extracting} className={styles.secondaryButton}>
            {extracting ? 'Extracting vocabulary...' : 'Extract vocabulary now'}
          </button>
        </div>
      )}

      {extractError && <p className={styles.errorText}>{extractError}</p>}

      {extractResult && (
        <div className={styles.resultBlock}>
          <p className={styles.successText}>
            Extracted. {extractResult.newWordsInserted} new word(s) inserted,{' '}
            {extractResult.existingWordsBumped} existing draft(s) bumped,{' '}
            {extractResult.skippedLines.length} line(s) skipped.
          </p>

          {extractResult.skippedLines.length > 0 && (
            <div>
              <strong>Skipped lines:</strong>
              <ul className={styles.skippedList}>
                {extractResult.skippedLines.map((s, i) => (
                  <li key={i}>
                    Line {s.lineIndex}: {s.reason} — &quot;{s.gujarati}&quot; / &quot;{s.phonetic}&quot;
                  </li>
                ))}
              </ul>
            </div>
          )}

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Gujarati</th>
                <th>Phonetic</th>
                <th>Frequency</th>
                <th>Gloss</th>
                <th>New?</th>
              </tr>
            </thead>
            <tbody>
              {extractResult.words.map((w, i) => (
                <tr key={i}>
                  <td className={styles.gujaratiCell}>{w.gujarati}</td>
                  <td>{w.phonetic}</td>
                  <td>{w.frequency}</td>
                  <td>{w.gloss ?? '(unchanged)'}</td>
                  <td>{w.wasNew ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
