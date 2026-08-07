import { query } from '@/lib/db';

/**
 * Processes a source_texts row into vocab_candidates: splits each
 * stanza's Gujarati/phonetic line pair into aligned words, dedupes
 * against existing content_items and vocab_candidates, and drafts an
 * English gloss for genuinely new words via the Groq API.
 */

interface StanzaPair {
  gujarati: string;
  phonetic: string;
}

interface SourceTextRow {
  id: string;
  title: string;
  stanza_pairs: StanzaPair[];
}

interface WordOccurrence {
  gujaratiWord: string;
  phoneticWord: string;
  lineContext: string; // the full gujarati line the word came from, for gloss context
}

export interface ExtractVocabResult {
  sourceTextId: string;
  skippedLines: Array<{ lineIndex: number; reason: string; gujarati: string; phonetic: string }>;
  newWordsInserted: number;
  existingWordsBumped: number;
  words: Array<{ gujarati: string; phonetic: string; frequency: number; gloss: string | null; wasNew: boolean }>;
}

// Gujarati word-splitting: whitespace plus standard punctuation —
// dandas (। ॥), comma, period, and a few other marks that show up in
// devotional texts. Words are the non-empty tokens left after
// splitting on any run of these.
const SPLIT_PATTERN = /[\s।॥,.!?;:"'()।॥]+/;

function splitWords(line: string): string[] {
  return line
    .split(SPLIT_PATTERN)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

async function fetchSourceText(sourceTextId: string): Promise<SourceTextRow> {
  const { rows } = await query(
    `select id, title, stanza_pairs from source_texts where id = $1`,
    [sourceTextId],
  );
  if (rows.length === 0) {
    throw new Error(`source_texts row not found for id ${sourceTextId}`);
  }
  return rows[0];
}

async function fetchExistingWordSet(): Promise<Set<string>> {
  const [{ rows: itemRows }, { rows: candidateRows }] = await Promise.all([
    query(
      `select gujarati_text from content_items where item_type in ('word', 'letter')`,
    ),
    query(`select word_gujarati from vocab_candidates`),
  ]);
  const set = new Set<string>();
  for (const r of itemRows) set.add(r.gujarati_text);
  for (const r of candidateRows) set.add(r.word_gujarati);
  return set;
}

async function fetchDraftCandidateByWord(
  gujaratiWord: string,
): Promise<{ id: string; frequency_count: number; source_text_ids: string[] } | null> {
  const { rows } = await query(
    `select id, frequency_count, source_text_ids from vocab_candidates
     where word_gujarati = $1 and status = 'draft'
     limit 1`,
    [gujaratiWord],
  );
  return rows[0] ?? null;
}

/**
 * Generates a concise English gloss for a Gujarati word using Groq's
 * chat completions API. Only the gloss is requested — the Gujarati and
 * phonetic spellings we already have are gold-standard from the source
 * text and are never sent back for regeneration.
 */
async function generateGloss(gujaratiWord: string, phoneticWord: string, lineContext: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not set. Add it to .env.local (see .env.local.example) before running vocab extraction.',
    );
  }

  const prompt =
    `You are glossing vocabulary for a Gujarati literacy app that teaches devotional/philosophical texts. ` +
    `Give a concise English gloss (1-5 words) for the Gujarati word below, appropriate to devotional/philosophical register. ` +
    `Do not transliterate or alter the Gujarati/phonetic spelling — only return the gloss.\n\n` +
    `Gujarati word: ${gujaratiWord}\n` +
    `Phonetic: ${phoneticWord}\n` +
    `Line context: ${lineContext}\n\n` +
    `Respond with ONLY the gloss (1-5 words), no punctuation, no explanation.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 20,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  const gloss = data?.choices?.[0]?.message?.content?.trim();
  if (!gloss) {
    throw new Error(`Groq API returned no gloss for word "${gujaratiWord}"`);
  }
  return gloss;
}

export async function extractVocab(sourceTextId: string): Promise<ExtractVocabResult> {
  const sourceText = await fetchSourceText(sourceTextId);
  const skippedLines: ExtractVocabResult['skippedLines'] = [];

  // Collect word occurrences per line, skipping any line pair whose
  // word counts don't match — no guessing alignment.
  const occurrences: WordOccurrence[] = [];
  sourceText.stanza_pairs.forEach((pair, lineIndex) => {
    const gujaratiWords = splitWords(pair.gujarati);
    const phoneticWords = splitWords(pair.phonetic);

    if (gujaratiWords.length !== phoneticWords.length) {
      const reason =
        `word count mismatch: Gujarati has ${gujaratiWords.length}, Phonetic has ${phoneticWords.length}`;
      skippedLines.push({ lineIndex, reason, gujarati: pair.gujarati, phonetic: pair.phonetic });
      console.warn(`[extractVocab] Skipping line ${lineIndex} for source ${sourceTextId}: ${reason}`);
      return;
    }

    gujaratiWords.forEach((gujaratiWord, i) => {
      occurrences.push({
        gujaratiWord,
        phoneticWord: phoneticWords[i],
        lineContext: pair.gujarati,
      });
    });
  });

  // Frequency count across this source text, keyed by exact gujarati text.
  const frequencyByWord = new Map<string, { phoneticWord: string; lineContext: string; count: number }>();
  for (const occ of occurrences) {
    const existing = frequencyByWord.get(occ.gujaratiWord);
    if (existing) {
      existing.count += 1;
    } else {
      frequencyByWord.set(occ.gujaratiWord, {
        phoneticWord: occ.phoneticWord,
        lineContext: occ.lineContext,
        count: 1,
      });
    }
  }

  const existingWords = await fetchExistingWordSet();

  const resultWords: ExtractVocabResult['words'] = [];
  let newWordsInserted = 0;
  let existingWordsBumped = 0;

  for (const [gujaratiWord, info] of frequencyByWord.entries()) {
    // Already a known content_item (word/letter) — not a candidate.
    if (existingWords.has(gujaratiWord)) {
      continue;
    }

    // Already a draft vocab_candidate from a previous extraction —
    // bump frequency and append this source, no new gloss call.
    const existingDraft = await fetchDraftCandidateByWord(gujaratiWord);
    if (existingDraft) {
      const alreadyLinked = existingDraft.source_text_ids.includes(sourceTextId);
      const newSourceIds = alreadyLinked
        ? existingDraft.source_text_ids
        : [...existingDraft.source_text_ids, sourceTextId];

      await query(
        `update vocab_candidates
         set frequency_count = frequency_count + $1, source_text_ids = $2
         where id = $3`,
        [info.count, JSON.stringify(newSourceIds), existingDraft.id],
      );
      existingWordsBumped += 1;
      resultWords.push({
        gujarati: gujaratiWord,
        phonetic: info.phoneticWord,
        frequency: existingDraft.frequency_count + info.count,
        gloss: null, // not re-fetched
        wasNew: false,
      });
      continue;
    }

    // Genuinely new word — gloss it and insert.
    const gloss = await generateGloss(gujaratiWord, info.phoneticWord, info.lineContext);

    await query(
      `insert into vocab_candidates
         (word_gujarati, word_phonetic, frequency_count, gloss_draft, status, source_text_ids)
       values ($1, $2, $3, $4, 'draft', $5)`,
      [gujaratiWord, info.phoneticWord, info.count, gloss, JSON.stringify([sourceTextId])],
    );
    newWordsInserted += 1;
    resultWords.push({
      gujarati: gujaratiWord,
      phonetic: info.phoneticWord,
      frequency: info.count,
      gloss,
      wasNew: true,
    });
  }

  // Mark this source text as extracted so the admin UI can distinguish
  // "not yet processed" from "processed, nothing new came out of it".
  await query(`update source_texts set extracted_at = now() where id = $1`, [sourceTextId]);

  return {
    sourceTextId,
    skippedLines,
    newWordsInserted,
    existingWordsBumped,
    words: resultWords,
  };
}
