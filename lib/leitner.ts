import { query } from '@/lib/db';

/**
 * Leitner box spaced-repetition scheduling. Five boxes, each with a
 * fixed review interval; a correct answer advances a card toward the
 * slower-review boxes, an incorrect answer resets it to box 1.
 */

const BOX_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export interface ScheduleResult {
  newBoxLevel: number;
  nextReviewDate: string; // ISO date (date only, e.g. "2026-08-14")
}

function addDaysAsIsoDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Computes the next box level and review date for a card given its
 * current box level and whether the most recent attempt was correct.
 */
export function scheduleNext(currentBoxLevel: number, wasCorrect: boolean): ScheduleResult {
  if (!wasCorrect) {
    return { newBoxLevel: 1, nextReviewDate: addDaysAsIsoDate(BOX_INTERVAL_DAYS[1]) };
  }

  const newBoxLevel = Math.min(currentBoxLevel + 1, 5);
  return { newBoxLevel, nextReviewDate: addDaysAsIsoDate(BOX_INTERVAL_DAYS[newBoxLevel]) };
}

/**
 * Records one exercise attempt for a content item and updates its
 * spaced-repetition schedule accordingly:
 *   1. Inserts into exercise_attempts.
 *   2. Fetches (or lazily creates, starting at box 1) item_progress.
 *   3. Runs scheduleNext() against the current box level.
 *   4. Upserts item_progress with the new box level, next review date,
 *      bumped correct/incorrect count, and last_reviewed_at = now.
 */
export async function recordAttempt(contentItemId: string, wasCorrect: boolean): Promise<ScheduleResult> {
  await query(`insert into exercise_attempts (content_item_id, was_correct) values ($1, $2)`, [
    contentItemId,
    wasCorrect,
  ]);

  const { rows: existingRows } = await query(
    `select box_level from item_progress where content_item_id = $1`,
    [contentItemId],
  );
  const currentBoxLevel = existingRows.length > 0 ? existingRows[0].box_level : 1;

  const { newBoxLevel, nextReviewDate } = scheduleNext(currentBoxLevel, wasCorrect);

  await query(
    `insert into item_progress
       (content_item_id, box_level, next_review_date, correct_count, incorrect_count, last_reviewed_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (content_item_id) do update set
       box_level = excluded.box_level,
       next_review_date = excluded.next_review_date,
       correct_count = item_progress.correct_count + excluded.correct_count,
       incorrect_count = item_progress.incorrect_count + excluded.incorrect_count,
       last_reviewed_at = excluded.last_reviewed_at`,
    [contentItemId, newBoxLevel, nextReviewDate, wasCorrect ? 1 : 0, wasCorrect ? 0 : 1],
  );

  return { newBoxLevel, nextReviewDate };
}
