import { useEffect, useState } from 'react';
import { decompose, toGraphemeClusters } from '@/lib/gujarati-script';
import { generateMultipleChoice, type ContentItem, type MultipleChoiceQuestion } from '@/lib/quiz';

export type { ContentItem };

export interface LessonSessionProps {
  items: ContentItem[];
  onComplete: () => void;
}

type Phase = 'flashcard' | 'quiz';

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
    return <p>No items in this session.</p>;
  }

  if (!currentItem) {
    // index has run past the end -- shouldn't normally be visible since
    // handleNext calls onComplete instead of over-advancing, but guard
    // against it rather than crashing on undefined.
    return <p>Session complete.</p>;
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

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 600,
        background: '#fff',
        color: '#111',
        padding: '1.5rem',
        borderRadius: 8,
      }}
    >
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Item {index + 1} of {items.length}
      </p>

      {phase === 'flashcard' && (
        <div>
          <div style={{ fontSize: '4rem', textAlign: 'center', margin: '1rem 0' }}>
            {currentItem.gujarati_text}
          </div>

          {!revealed && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setRevealed(true)} style={{ padding: '0.5rem 1.5rem', fontSize: '1rem' }}>
                Reveal
              </button>
            </div>
          )}

          {revealed && (
            <div>
              <div style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                {currentItem.phonetic_text}
              </div>
              {currentItem.meaning && (
                <div style={{ textAlign: 'center', fontSize: '1.1rem', color: '#444', marginBottom: '1rem' }}>
                  {currentItem.meaning}
                </div>
              )}

              {showsBreakdown && (
                <div style={{ margin: '1rem 0' }}>
                  <button
                    onClick={() => setShowBreakdown((s) => !s)}
                    style={{ padding: '0.4rem 1rem', marginBottom: '0.75rem' }}
                  >
                    {showBreakdown ? 'Hide letter breakdown' : 'Show letter breakdown'}
                  </button>

                  {showBreakdown && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {toGraphemeClusters(currentItem.gujarati_text).map((cluster, i) => {
                        const d = decompose(cluster);
                        return (
                          <div
                            key={i}
                            style={{
                              border: '1px solid #ccc',
                              borderRadius: 4,
                              padding: '0.5rem',
                              textAlign: 'center',
                              minWidth: 60,
                            }}
                          >
                            <div style={{ fontSize: '1.75rem' }}>{cluster}</div>
                            <div style={{ fontSize: '0.8rem', color: '#555' }}>
                              {d.consonant && <div>consonant: {d.consonantPhonetic}</div>}
                              {/* d.matra set means an attached vowel sign; matraName alone (no
                                  matra, no consonant) means this cluster is a bare independent
                                  vowel, which decompose() also reports via matraName. */}
                              {d.matra && d.matraName && <div>matra: {d.matraName}</div>}
                              {d.consonant && !d.matra && <div>vowel: a (inherent)</div>}
                              {!d.consonant && d.matraName && <div>vowel: {d.matraName}</div>}
                              {d.isCompound && <div style={{ color: '#a60' }}>conjunct (partial)</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button onClick={handleContinueToQuiz} style={{ padding: '0.5rem 1.5rem', fontSize: '1rem' }}>
                  Continue to quiz
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'quiz' && quiz && (
        <div>
          <div style={{ fontSize: '3rem', textAlign: 'center', margin: '1rem 0' }}>
            {currentItem.gujarati_text}
          </div>
          <p style={{ textAlign: 'center', fontWeight: 'bold' }}>{quizPrompt}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
            {quiz.options.map((option, i) => {
              const isSelected = selectedOption === option;
              const isCorrectOption = option === quiz.correctAnswer;
              let background = '#fff';
              if (selectedOption) {
                if (isCorrectOption) background = '#c8f7c5';
                else if (isSelected) background = '#f7c5c5';
              }
              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(option)}
                  disabled={!!selectedOption}
                  style={{
                    padding: '0.6rem 1rem',
                    fontSize: '1.1rem',
                    textAlign: 'left',
                    background,
                    color: '#111',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {selectedOption && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 'bold', color: selectedOption === quiz.correctAnswer ? 'green' : 'crimson' }}>
                {selectedOption === quiz.correctAnswer ? 'Correct!' : `Incorrect. Correct answer: ${quiz.correctAnswer}`}
              </p>
              {recordError && <p style={{ color: 'crimson', fontSize: '0.85rem' }}>{recordError}</p>}
              <button onClick={handleNext} style={{ padding: '0.5rem 1.5rem', fontSize: '1rem' }}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
