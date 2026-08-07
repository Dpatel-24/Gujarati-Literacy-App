-- Links a content_units row back to the source_texts row it was
-- scaffolded from (used for module 'text' placeholder units created
-- at import time). Nullable -- most units (Vowels, Consonants,
-- word-chapter units) have no source text of their own.
alter table content_units add column if not exists source_text_id uuid references source_texts(id);
