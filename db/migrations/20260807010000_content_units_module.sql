-- Adds a `module` column to content_units for grouping units into
-- higher-level curriculum sections (letters / text / vocabulary),
-- distinct from unit_type (which classifies the content_items within
-- a unit as letters/words/sentences).
alter table content_units add column if not exists module text;

-- Backfill existing rows before enforcing not-null.
update content_units set module = 'letters' where unit_type = 'letters' and module is null;
update content_units set module = 'vocabulary' where unit_type = 'words' and module is null;

alter table content_units
  add constraint content_units_module_check check (module in ('letters', 'text', 'vocabulary'));
alter table content_units alter column module set not null;
