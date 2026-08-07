/**
 * Multiple-choice quiz generation for content_items.
 */

export interface ContentItem {
  id: string;
  gujarati_text: string;
  phonetic_text: string;
  meaning: string | null;
  item_type: 'letter' | 'word' | 'sentence';
  unit_id: string | null;
}

export interface MultipleChoiceQuestion {
  question: ContentItem;
  options: string[];
  correctAnswer: string;
}

const DISTRACTOR_COUNT = 3;
const MIN_OPTIONS = 2;

/**
 * The text a given content item should be quizzed on: phonetic
 * pronunciation for letters ("what does this say"), meaning for words
 * ("what does this mean"), falling back to phonetic_text if a word
 * has no meaning recorded.
 */
function answerTextFor(item: ContentItem): string {
  if (item.item_type === 'letter') {
    return item.phonetic_text;
  }
  return item.meaning ?? item.phonetic_text;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds a multiple-choice question for `item`: the prompt is always
 * "what does this say/mean" against item.gujarati_text, the correct
 * answer is its phonetic (letters) or meaning (words, falling back to
 * phonetic), and distractors are pulled from other items of the same
 * item_type — preferring the same unit first, then any matching-type
 * item elsewhere in the pool if the unit doesn't have enough.
 *
 * Returns fewer than 4 options (minimum 2) rather than throwing if the
 * pool doesn't have enough same-type items to fill out a full set.
 */
export function generateMultipleChoice(
  item: ContentItem,
  allItemsInPool: ContentItem[],
): MultipleChoiceQuestion {
  const correctAnswer = answerTextFor(item);

  const sameTypeOthers = allItemsInPool.filter((i) => i.id !== item.id && i.item_type === item.item_type);

  const sameUnit = sameTypeOthers.filter((i) => i.unit_id === item.unit_id);
  const otherUnit = sameTypeOthers.filter((i) => i.unit_id !== item.unit_id);

  const distractors: ContentItem[] = [];
  const usedAnswerTexts = new Set<string>([correctAnswer]);

  function tryAdd(candidates: ContentItem[]) {
    for (const candidate of shuffle(candidates)) {
      if (distractors.length >= DISTRACTOR_COUNT) return;
      const text = answerTextFor(candidate);
      // Skip candidates whose answer text duplicates one already
      // chosen (or the correct answer) so options stay distinguishable.
      if (usedAnswerTexts.has(text)) continue;
      distractors.push(candidate);
      usedAnswerTexts.add(text);
    }
  }

  tryAdd(sameUnit);
  if (distractors.length < DISTRACTOR_COUNT) {
    tryAdd(otherUnit);
  }

  const options = shuffle([correctAnswer, ...distractors.map(answerTextFor)]);

  if (options.length < MIN_OPTIONS) {
    // Not enough distinct distractors in the whole pool -- return
    // whatever we have rather than failing. Caller/UI should handle a
    // sub-minimum question (e.g. skip it) if this ever happens.
    return { question: item, options, correctAnswer };
  }

  return { question: item, options, correctAnswer };
}
