import styles from '@/styles/AdminForm.module.css';

/**
 * Plain reference page for how the app's pieces fit together --
 * admin workflow (import -> extract -> review -> approve) and the two
 * learner-facing session modes. No manuscript treatment here, this is
 * a utility page.
 */
export default function Help() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Help</h1>
      <p className={styles.subheading}>How the pieces of this app fit together.</p>

      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Adding new content</h2>
        <ol className={styles.skippedList}>
          <li>
            <strong>Import Text</strong> — paste a Gujarati text and its line-aligned phonetic
            transliteration. This creates a source text and, optionally, extracts candidate vocabulary words
            from it right away.
          </li>
          <li>
            <strong>Review Vocab</strong> — each extracted word starts as a draft with an AI-drafted gloss.
            Approve promotes it into the chapter for that source text; reject discards it.
          </li>
        </ol>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Studying</h2>
        <p className={styles.subheading} style={{ marginBottom: 0 }}>
          From the home page, open any chapter or Review, then choose one of two modes:
        </p>
        <ul className={styles.skippedList}>
          <li>
            <strong>Study</strong> — flashcards only. See the Gujarati, reveal its phonetic reading and
            meaning, optionally see a letter-by-letter breakdown for words. No quiz.
          </li>
          <li>
            <strong>Quiz me</strong> — multiple-choice only, no flashcard shown first. Answers are recorded
            and feed the spaced-repetition schedule (due items resurface in Review).
          </li>
        </ul>
      </div>
    </main>
  );
}
