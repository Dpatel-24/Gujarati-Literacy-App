-- Gujarati Literacy App — initial schema (Neon Postgres)
-- Single-user personal app, no auth/RLS — DB access is server-only via
-- DATABASE_URL. See README / .env.local.example.

-- 1. content_units
create table if not exists content_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_type text not null check (unit_type in ('letters', 'words', 'sentences')),
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- 2. source_texts
create table if not exists source_texts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  gujarati_raw text not null,
  phonetic_raw text not null,
  stanza_pairs jsonb not null, -- array of {gujarati: string, phonetic: string}, one per line/stanza
  created_at timestamptz default now()
);

-- 3. content_items
create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references content_units(id),
  item_type text not null check (item_type in ('letter', 'word', 'sentence')),
  gujarati_text text not null,
  phonetic_text text not null,
  meaning text, -- nullable, letters won't have a meaning
  status text not null default 'draft' check (status in ('draft', 'approved')),
  source_text_id uuid references source_texts(id), -- nullable, null for letters
  created_at timestamptz default now()
);

-- 4. vocab_candidates
create table if not exists vocab_candidates (
  id uuid primary key default gen_random_uuid(),
  word_gujarati text not null,
  word_phonetic text not null,
  frequency_count int not null default 1,
  gloss_draft text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  source_text_ids jsonb not null default '[]'::jsonb, -- array of source_texts.id
  promoted_content_item_id uuid references content_items(id),
  created_at timestamptz default now()
);

-- 5. item_progress
create table if not exists item_progress (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id),
  box_level int not null default 1, -- Leitner box 1-5
  next_review_date date not null default current_date,
  correct_count int not null default 0,
  incorrect_count int not null default 0,
  last_reviewed_at timestamptz,
  unique (content_item_id)
);

-- 6. exercise_attempts
create table if not exists exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id),
  was_correct boolean not null,
  attempted_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_content_items_unit_id on content_items(unit_id);
create index if not exists idx_content_items_source_text_id on content_items(source_text_id);
create index if not exists idx_item_progress_content_item_id on item_progress(content_item_id);
create index if not exists idx_item_progress_next_review_date on item_progress(next_review_date);
create index if not exists idx_exercise_attempts_content_item_id on exercise_attempts(content_item_id);
