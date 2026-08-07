-- Tracks whether a source_texts row has had vocab extraction run
-- against it, so the admin UI can show extracted vs. not-yet-extracted
-- and offer an "Extract" action only where it's needed.
alter table source_texts add column if not exists extracted_at timestamptz;
