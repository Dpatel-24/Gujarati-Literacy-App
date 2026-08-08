# Gujarati Literacy

A personal tool for learning to read and write the Gujarati script, built by someone who already speaks the language fluently. The gap is literacy, not vocabulary or grammar: the goal is connecting sounds I already know to letterforms I don't, using real devotional and literary text instead of a phrasebook.

This is a working personal project, not a product. It's shared here for reference; see the reuse note at the bottom.

## Why

Most language apps assume you're starting from zero on vocabulary, grammar, and script all at once. That's the wrong problem for a heritage speaker who already thinks and speaks the language but never learned to read it. So the approach here is narrower:

- No vocabulary drilling or grammar. Every word already has a spoken meaning attached; the only new information is the mapping from sound to written form.
- Letters before words before sentences, in that order. Vowels and consonants first, then whole words pulled from real text. Sentences are planned but not built yet.
- Spaced repetition (a Leitner box system) so recently-missed items resurface sooner than ones that are sticking.
- Vocabulary comes from actual text, currently excerpts from Shrimad Rajchandra's writings, not a generic word-frequency list. The words being learned are words that show up in text worth reading.

## Features

- **Module structure.** Letters (split into Vowels and Consonants), Vocabulary (words grouped manually after review), and Text (a placeholder for future sentence-level content; source texts are scaffolded into it at import but not yet populated).
- **Two separate session modes.** Study shows a flashcard (Gujarati, then its phonetic reading and meaning) with no quiz attached, so it's for learning rather than testing recall of something just shown. Quiz is multiple choice with no flashcard first, so it actually measures retention.
- **Letter-breakdown and underline toggles** on word flashcards. One decomposes the word into grapheme clusters with interlinear phonetic annotations; the other underlines each cluster without the annotation. Either can be on alone or both together.
- **Spaced repetition scheduling.** A five-box Leitner system tracks progress per item: correct answers push a card to a longer interval, wrong answers reset it to the shortest one. A Review flow surfaces whatever is due across every chapter.
- **AI-assisted vocabulary extraction, narrowly scoped.** Words are split out of source text and counted by plain code, not an LLM. An LLM (via Groq) does exactly one job: drafting a short English gloss for each new word, given the word, its transliteration, and the source line as context. It never touches the Gujarati script or the phonetic transliteration; those are typed in by hand and treated as ground truth for the rest of the pipeline. I trust a model to guess at a meaning I can review, not to rewrite the source text.
- **Human review at every promotion step.** Nothing an LLM drafts reaches the learner without a manual approve/reject pass, and nothing is auto-grouped into a chapter.

## Tech stack

Next.js (Pages Router, TypeScript), Neon (serverless Postgres), Groq API for vocabulary glossing, deployed on Vercel.

## Architecture

The content pipeline is two-phase and human-in-the-loop. Gujarati source text and its line-aligned phonetic transliteration are pasted in together and stored verbatim; nothing downstream can alter them. The text is split into words by plain code, deduplicated, and each new word gets a short English gloss from an LLM. That word then sits in a draft queue until manually approved or rejected. Approved words land unassigned rather than getting auto-sorted, and get grouped into vocabulary chapters by hand, so the grouping reflects actual editorial judgment instead of a heuristic. Once a word or letter belongs to a chapter, it enters the normal study/quiz/review cycle under the Leitner scheduler.

## Status

Built and working: the full letters curriculum (vowels/consonants), text import with AI-assisted vocabulary extraction, the review/approval/grouping pipeline, study and quiz modes with spaced repetition, and an admin toolset for managing all of it.

Not yet built: sentence-level content (the Text module exists structurally but isn't populated), a standalone matras reference (matras are used internally by the letter-breakdown logic but aren't their own study module), and any form of multi-user support, which isn't planned.

---

This repository is shared publicly for reference and portfolio purposes only. No license is granted for reuse, modification, or redistribution at this time.
