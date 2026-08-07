import { useEffect, useState } from 'react';
import { decompose, toGraphemeClusters, type DecomposeResult } from '@/lib/gujarati-script';
import { generateMultipleChoice, type ContentItem, type MultipleChoiceQuestion } from '@/lib/quiz';
import styles from '@/styles/LessonSession.module.css';

export type { ContentItem };

export interface LessonSessionProps {
  items: ContentItem[];
  onComplete: () => void;
}

type Phase = 'flashcard' | 'quiz';

/**
 * Short interlinear-gloss label for one grapheme cluster's breakdown,
 * e.g. "ka+aa" for કા, "ka" for bare ક, "a" for a bare vowel. Kept
 * terse on purpose -- these render tiny, directly under each
 * character, manuscript-annotation style, not as a verbose legend.
 */
function annotationFor(d: DecomposeResult): string {
  let label: string;
  if (d.consonant && d.matra && d.matraName) {
    label = `${d.consonantPhonetic}+${d.matraName}`;
  } else if (d.consonant && !d.matra) {
    label = d.consonantPhonetic ?? '';
  } else if (!d.consonant && d.matraName) {
    label = d.matraName;
  } else {
    label = '?';
  }
  return d.isCompound ? `${label}*` : label;
}

/**
 * Walks through `items` one at a time: flashcard (reveal phonetic +
 * meaning, optional letter breakdown for words/sentences) then a
 * multiple-choice quiz on the same item, recording the attempt via
 * /api/record-attempt. Advances to the next item on "Next"; calls
 * onComplete() after the last one.
 *
 * Purely a queue walker — does not fetch or choose which items to
 * study. Callers decide that and pass the resulting array in.
 */
export default function LessonSession({ items, onComplete }: LessonSessionProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('flashcard');
  const [revealed, setRevealed] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [quiz, setQuiz] = useState<MultipleChoiceQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const currentItem = items[index];

  // Reset per-item UI state every time we move to a new item.
  useEffect(() => {
    setPhase('flashcard');
    setRevealed(false);
    setShowBreakdown(false);
    setQuiz(null);
    setSelectedOption(null);
    setRecordError(null);
  }, [index]);

  if (items.length === 0) {
    return (
      <div className={styles.leaf}>
        <p className={styles.emptyState}>No items in this session.</p>
      </div>
    );
  }

  if (!currentItem) {
    // index has run past the end -- shouldn't normally be visible since
    // handleNext calls onComplete instead of over-advancing, but guard
    // against it rather than crashing on undefined.
    return (
      <div className={styles.leaf}>
        <p className={styles.emptyState}>Session complete.</p>
      </div>
    );
  }

  const showsBreakdown = currentItem.item_type === 'word' || currentItem.item_type === 'sentence';
  const quizPrompt = currentItem.item_type === 'letter' ? 'What does this say?' : 'What does this mean?';

  function handleContinueToQuiz() {
    const mc = generateMultipleChoice(currentItem, items);
    setQuiz(mc);
    setPhase('quiz');
  }

  async function handleSelectOption(option: string) {
    if (selectedOption || !quiz) return; // already answered this question
    setSelectedOption(option);

    const wasCorrect = option === quiz.correctAnswer;
    setRecordError(null);
    try {
      const res = await fetch('/api/record-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentItemId: currentItem.id, wasCorrect }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRecordError(data.error ?? 'Failed to record attempt (your answer still counts on screen)');
      }
    } catch (err: any) {
      setRecordError(err.message);
    }
  }

  function handleNext() {
    if (index + 1 >= items.length) {
      onComplete();
    } else {
      setIndex(index + 1);
    }
  }

  const graphemeClusters = showsBreakdown ? toGraphemeClusters(currentItem.gujarati_text) : [];

  return (
    <div className={styles.leaf}>
      <p className={`text-small ${styles.progress}`}>
        Leaf {index + 1} of {items.length}
      </p>

      {phase === 'flashcard' && (
        <div key={`flashcard-${index}`} className={styles.fadeIn}>
          <div className={styles.heroWrap}>
            {showBreakdown && showsBreakdown ? (
              <div className={styles.heroInterlinear}>
                {graphemeClusters.map((cluster, i) => (
                  <span key={i} className={styles.heroChar}>
                    <span className={styles.heroCharGlyph}>{cluster}</span>
                    <span className={styles.heroCharAnnotation}>{annotationFor(decompose(cluster))}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className={styles.hero}>{currentItem.gujarati_text}</div>
            )}
          </div>

          {!revealed && (
            <div className={styles.actionRow}>
              <button onClick={() => setRevealed(true)} className={styles.primaryButton}>
                Reveal
              </button>
            </div>
          )}

          {revealed && (
            <div>
              <div className={styles.phoneticText}>{currentItem.phonetic_text}</div>
              {currentItem.meaning && <div className={styles.meaningText}>{currentItem.meaning}</div>}

              {showsBreakdown && (
                <div className={styles.breakdownSection}>
                  <button onClick={() => setShowBreakdown((s) => !s)} className={styles.breakdownToggle}>
                    {showBreakdown ? 'Hide letter breakdown' : 'Show letter breakdown'}
                  </button>
                </div>
              )}

              <div className={styles.actionRow}>
                <button onClick={handleContinueToQuiz} className={styles.primaryButton}>
                  Continue to quiz
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'quiz' && quiz && (
        <div key={`quiz-${index}`} className={styles.fadeIn}>
          <div className={styles.quizHeroWrap}>
            <div className={styles.quizHero}>{currentItem.gujarati_text}</div>
          </div>
          <p className={styles.quizPrompt}>{quizPrompt}</p>

          <div className={styles.optionsList}>
            {quiz.options.map((option, i) => {
              const isSelected = selectedOption === option;
              const isCorrectOption = option === quiz.correctAnswer;

              let optionClassName = styles.optionButton;
              if (selectedOption) {
                if (isSelected && isCorrectOption) {
                  optionClassName = `${styles.optionButton} ${styles.optionCorrect}`;
                } else if (isSelected && !isCorrectOption) {
                  optionClassName = `${styles.optionButton} ${styles.optionIncorrect}`;
                } else if (isCorrectOption) {
                  // The user picked something else -- show which one
                  // actually was correct with the lighter tint, not
                  // the full "you picked this" fill.
                  optionClassName = `${styles.optionButton} ${styles.optionCorrectReveal}`;
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(option)}
                  disabled={!!selectedOption}
                  className={optionClassName}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {selectedOption && (
            <div className={styles.feedbackRow}>
              <p
                className={`${styles.feedbackText} ${
                  selectedOption === quiz.correctAnswer ? styles.feedbackCorrect : styles.feedbackIncorrect
                }`}
              >
                {selectedOption === quiz.correctAnswer ? 'Correct' : `Incorrect — correct answer: ${quiz.correctAnswer}`}
              </p>
              {recordError && <p className={styles.recordError}>{recordError}</p>}
              <button onClick={handleNext} className={styles.primaryButton}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
