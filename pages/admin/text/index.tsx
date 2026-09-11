import Link from 'next/link';
import styles from '@/styles/AdminForm.module.css';

/**
 * Landing page for the Text module -- where full-text translations
 * (source text + phonetic transliteration, paired line by line) live.
 * Importing a new text is a separate page (import.tsx) reached via
 * the button below, so this page is free to grow into a browse/list
 * view of existing texts later without crowding the import form.
 */
export default function Text() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Text</h1>
      <p className={styles.subheading}>
        This is where full text translations are stored: Gujarati source text paired line by line with its
        phonetic transliteration.
      </p>

      <Link href="/admin/text/import" className={styles.primaryButton}>
        Import text
      </Link>
    </main>
  );
}
