# Gujarati Literacy

A personal tool for learning to read and write the Gujarati script — built by someone who already speaks Gujarati fluently. The gap this app is built to close is literacy, not vocabulary or grammar: the goal is to connect sounds I already know to letterforms I don't, using real devotional and literary text rather than a generic phrasebook.

This is a working personal project, not a product. It's shared here for reference — see the note at the bottom on reuse.

## Why

Most language apps assume you're starting from zero: vocabulary, grammar, and script all at once. That's the wrong shape of problem for a heritage speaker who already thinks and speaks in the language but never learned to read it. So the app is built around a narrower, more specific approach:

- **Leverage existing fluency.** No vocabulary drilling or grammar explanations — every word already has a spoken meaning attached. The only new information is the mapping from spoken sound to written form.
- **Letters before words before sentences.** The curriculum is structured in that order deliberately: independent vowels and consonants first, then whole words pulled from real text, with sentence-level content planned but not yet built.
- **Spaced repetition for retention.** A Leitner box system schedules review so recently-missed letters and words resurface sooner than ones that are sticking.
- **Real source material, not a word list.** Vocabulary is extracted from actual devotional and literary text (currently excerpts from Shrimad Rajchandra's writings), not a generic frequency-ranked vocabulary list. The words being learned are words that show up in text worth reading.

## Features

- **Module-based content structure.** Content is organized into three areas: Letters (split into separate Vowels and Consonants chapters), Vocabulary (words grouped manually into study sets after review), and Text (a placeholder module for future sentence-level reading content — source texts are scaffolded into this structure at import time but not yet populated).
- **Two independent session modes.** Study mode shows a flashcard (reveal the Gujarati, then its phonetic reading and meaning) with no quiz attached — the point is to learn the item, not test recall of something just shown. Quiz mode is multiple-choice only, with no flashcard shown first, so it actually measures retention.
- **Letter-breakdown and underline toggles.** On word flashcards, one toggle decomposes the word into its grapheme clusters with interlinear phonetic annotations (consonant + matra breakdown); a second, independent toggle underlines each grapheme cluster without the annotation. Either can be on alone or together.
- **Spaced repetition scheduling.** A five-box Leitner system tracks per-item progress; correct answers advance a card to a longer review interval, incorrect answers reset it to the shortest one. A dedicated Review flow surfaces whatever is currently due across every chapter.
- **AI-assisted vocabulary extraction, with a deliberately narrow scope for the AI.** Source text is split into words and their occurrence frequency is counted by plain code — that part is deterministic and untouched by any model. An LLM (via Groq) is used for exactly one thing: drafting a short English gloss for each new word, given the word, its transliteration, and its source line as context. The model never sees or touches the Gujarati script or the phonetic transliteration — those come from the source text as typed in and are treated as ground truth throughout the pipeline. That scoping is a deliberate choice: I trust an LLM to guess at an English meaning I can review, not to silently rewrite the Gujarati or its transliteration.
- **Human review at every promotion step.** Nothing an LLM drafts becomes visible to the learner without a manual approve/reject pass, and nothing gets grouped into a study chapter automatically — see Architecture below.

## Tech stack

- **Next.js** (Pages Router, TypeScript) — application framework
- **Neon** (serverless Postgres) — database
- **Groq API** — LLM inference for vocabulary glossing
- **Vercel** — hosting/deployment

## Architecture

The content pipeline is a two-phase, human-in-the-loop process:

1. **Import.** Gujarati source text and its line-aligned phonetic transliteration are pasted in together. This is stored verbatim as the source of truth — nothing downstream is allowed to alter it.
2. **AI-assisted extraction.** The source text is split into individual words by plain code (not an LLM), deduplicated against everything already in the system, and each genuinely new word gets a short English gloss drafted by an LLM.
3. **Human review.** Every extracted word sits in a draft queue until manually approved or rejected. Approval promotes it into the live content set; nothing is added to what a learner sees without that step.
4. **Manual grouping.** Approved words don't get auto-sorted into a chapter. They land unassigned, and get manually organized into vocabulary groups — deliberately not automated, so the resulting chapters reflect actual editorial judgment about what belongs together rather than whatever heuristic assigned it at approval time.
5. **Spaced repetition.** Once a word or letter is part of a chapter, it enters the normal study/quiz/review cycle, tracked independently per item via the Leitner scheduler.

## Status

**Built and working:** letters (vowels/consonants) as a complete, seeded curriculum; text import with AI-assisted vocabulary extraction; the human review/approval/grouping pipeline described above; study and quiz session modes with spaced repetition; a full admin toolset for managing content.

**Not yet built:**
- Sentence-level content — the Text module exists structurally (source texts are scaffolded into it at import time) but isn't populated with practiceable content yet.
- A standalone matras (dependent vowel signs) reference — matras are used internally by the letter-breakdown logic but aren't yet a study module of their own.
- Any of this being usable by anyone other than me — there's no multi-user support, and none is currently planned.

---

**A note on reuse:** this repository is shared publicly for reference and portfolio purposes only. No license is granted for reuse, modification, or redistribution at this time.
