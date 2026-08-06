-- Gujarati Literacy App — initial schema
-- Single-user personal app. Every table is RLS-scoped to auth.uid() via a
-- `user_id` column set to auth.uid() by default, so all reads/writes require
-- the caller to be the authenticated owner.

-- 1. content_units
create table if not exists content_units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  unit_type text not null check (unit_type in ('letters', 'words', 'sentences')),
  sort_order int not null default 0,
  created_at timestamptz default now()
);

alter table content_units enable row level security;

create policy "content_units_select_own" on content_units
  for select using (auth.uid() = user_id);
create policy "content_units_insert_own" on content_units
  for insert with check (auth.uid() = user_id);
create policy "content_units_update_own" on content_units
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "content_units_delete_own" on content_units
  for delete using (auth.uid() = user_id);

-- 2. source_texts
create table if not exists source_texts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  gujarati_raw text not null,
  phonetic_raw text not null,
  stanza_pairs jsonb not null, -- array of {gujarati: string, phonetic: string}, one per line/stanza
  created_at timestamptz default now()
);

alter table source_texts enable row level security;

create policy "source_texts_select_own" on source_texts
  for select using (auth.uid() = user_id);
create policy "source_texts_insert_own" on source_texts
  for insert with check (auth.uid() = user_id);
create policy "source_texts_update_own" on source_texts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "source_texts_delete_own" on source_texts
  for delete using (auth.uid() = user_id);

-- 3. content_items
create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  unit_id uuid references content_units(id),
  item_type text not null check (item_type in ('letter', 'word', 'sentence')),
  gujarati_text text not null,
  phonetic_text text not null,
  meaning text, -- nullable, letters won't have a meaning
  status text not null default 'draft' check (status in ('draft', 'approved')),
  source_text_id uuid references source_texts(id), -- nullable, null for letters
  created_at timestamptz default now()
);

alter table content_items enable row level security;

create policy "content_items_select_own" on content_items
  for select using (auth.uid() = user_id);
create policy "content_items_insert_own" on content_items
  for insert with check (auth.uid() = user_id);
create policy "content_items_update_own" on content_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "content_items_delete_own" on content_items
  for delete using (auth.uid() = user_id);

-- 4. vocab_candidates
create table if not exists vocab_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  word_gujarati text not null,
  word_phonetic text not null,
  frequency_count int not null default 1,
  gloss_draft text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  source_text_ids jsonb not null default '[]'::jsonb, -- array of source_texts.id
  promoted_content_item_id uuid references content_items(id),
  created_at timestamptz default now()
);

alter table vocab_candidates enable row level security;

create policy "vocab_candidates_select_own" on vocab_candidates
  for select using (auth.uid() = user_id);
create policy "vocab_candidates_insert_own" on vocab_candidates
  for insert with check (auth.uid() = user_id);
create policy "vocab_candidates_update_own" on vocab_candidates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vocab_candidates_delete_own" on vocab_candidates
  for delete using (auth.uid() = user_id);

-- 5. item_progress
create table if not exists item_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content_item_id uuid not null references content_items(id),
  box_level int not null default 1, -- Leitner box 1-5
  next_review_date date not null default current_date,
  correct_count int not null default 0,
  incorrect_count int not null default 0,
  last_reviewed_at timestamptz,
  unique (content_item_id)
);

alter table item_progress enable row level security;

create policy "item_progress_select_own" on item_progress
  for select using (auth.uid() = user_id);
create policy "item_progress_insert_own" on item_progress
  for insert with check (auth.uid() = user_id);
create policy "item_progress_update_own" on item_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "item_progress_delete_own" on item_progress
  for delete using (auth.uid() = user_id);

-- 6. exercise_attempts
create table if not exists exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content_item_id uuid not null references content_items(id),
  was_correct boolean not null,
  attempted_at timestamptz default now()
);

alter table exercise_attempts enable row level security;

create policy "exercise_attempts_select_own" on exercise_attempts
  for select using (auth.uid() = user_id);
create policy "exercise_attempts_insert_own" on exercise_attempts
  for insert with check (auth.uid() = user_id);
create policy "exercise_attempts_update_own" on exercise_attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercise_attempts_delete_own" on exercise_attempts
  for delete using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_content_items_unit_id on content_items(unit_id);
create index if not exists idx_content_items_source_text_id on content_items(source_text_id);
create index if not exists idx_item_progress_content_item_id on item_progress(content_item_id);
create index if not exists idx_item_progress_next_review_date on item_progress(next_review_date);
create index if not exists idx_exercise_attempts_content_item_id on exercise_attempts(content_item_id);
