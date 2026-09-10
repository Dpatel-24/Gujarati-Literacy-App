import Head from 'next/head';
import { INDEPENDENT_VOWELS, CONSONANTS, type VowelInfo, type ConsonantInfo } from '@/lib/gujarati-script';
import styles from '@/styles/PronunciationKey.module.css';

const APPROX_TAG = '[approx]';

function ExampleCell({ soundExample }: { soundExample?: string }) {
  if (!soundExample) {
    return <span className={styles.noExample}>no example given</span>;
  }
  const isApprox = soundExample.includes(APPROX_TAG);
  const text = soundExample.replace(APPROX_TAG, '').trim();
  return <span className={isApprox ? `${styles.example} ${styles.exampleApprox}` : styles.example}>{text}</span>;
}

function LetterRow({ entry }: { entry: VowelInfo | ConsonantInfo }) {
  return (
    <div className={styles.row}>
      <span className={styles.glyph}>{entry.char}</span>
      <span className={styles.iast}>{entry.iast}</span>
      <ExampleCell soundExample={entry.soundExample} />
    </div>
  );
}

/**
 * Static reference page: every independent vowel and base consonant,
 * its IAST transliteration, and an English sound-alike example.
 * Companion to the letter-breakdown/sound-example work in
 * LessonSession -- this is the same data laid out as a scannable
 * table instead of one card at a time.
 */
export default function PronunciationKey() {
  return (
    <>
      <Head>
        <title>Pronunciation Key</title>
        <meta name="description" content="Reference table of Gujarati vowels and consonants with English sound-alikes" />
      </Head>
      <main className={styles.page}>
        <h1 className={styles.heading}>Pronunciation Key</h1>

        <p className={styles.intro}>
          A line over a vowel (<strong>ā ī ū</strong>) marks a long vowel: held longer than its plain
          counterpart, not a different sound.
        </p>
        <p className={styles.intro}>
          Some consonants have no exact English equivalent. Their example is written in <em>italics</em> as
          the closest reference point, not a precise match.
        </p>

        <h2 className={styles.sectionHeading}>Vowels</h2>
        <div className={styles.table}>
          {INDEPENDENT_VOWELS.map((v) => (
            <LetterRow key={v.char} entry={v} />
          ))}
        </div>

        <h2 className={styles.sectionHeading}>Consonants</h2>
        <div className={styles.table}>
          {CONSONANTS.map((c) => (
            <LetterRow key={c.char} entry={c} />
          ))}
        </div>
      </main>
    </>
  );
}
