// One-time reseed: splits the single "Letters" content_units row into
// "Vowels" and "Consonants", reassigning every content_items row of
// item_type 'letter' based on lib/gujarati-script.ts's own
// INDEPENDENT_VOWELS / CONSONANTS lookup tables (kept in sync by hand
// here since this is a plain .mjs script, not a TS import -- the char
// lists are transcribed directly from that file).
import { Client } from '@neondatabase/serverless';

const INDEPENDENT_VOWEL_CHARS = [
  'અ', 'આ', 'ઇ', 'ઈ', 'ઉ', 'ઊ', 'ઋ', 'એ', 'ઐ', 'ઓ', 'ઔ', 'અં', 'અઃ',
];

const CONSONANT_CHARS = [
  'ક', 'ખ', 'ગ', 'ઘ', 'ઙ', 'ચ', 'છ', 'જ', 'ઝ', 'ઞ', 'ટ', 'ઠ', 'ડ', 'ઢ',
  'ણ', 'ત', 'થ', 'દ', 'ધ', 'ન', 'પ', 'ફ', 'બ', 'ભ', 'મ', 'ય', 'ર', 'લ',
  'વ', 'શ', 'ષ', 'સ', 'હ', 'ળ',
];

const client = new Client(process.env.DATABASE_URL);
await client.connect();

try {
  const { rows: oldUnitRows } = await client.query(
    `select id from content_units where name = 'Letters' and unit_type = 'letters'`,
  );
  if (oldUnitRows.length === 0) {
    console.log('No "Letters" unit found -- nothing to split (already migrated?).');
  } else {
    const oldUnitId = oldUnitRows[0].id;

    const { rows: vowelsUnit } = await client.query(
      `insert into content_units (name, module, unit_type, sort_order)
       values ('Vowels', 'letters', 'letters', 0)
       returning id`,
    );
    const { rows: consonantsUnit } = await client.query(
      `insert into content_units (name, module, unit_type, sort_order)
       values ('Consonants', 'letters', 'letters', 1)
       returning id`,
    );
    const vowelsUnitId = vowelsUnit[0].id;
    const consonantsUnitId = consonantsUnit[0].id;

    const { rows: letterItems } = await client.query(
      `select id, gujarati_text from content_items where item_type = 'letter' and unit_id = $1`,
      [oldUnitId],
    );

    let vowelCount = 0;
    let consonantCount = 0;
    const unmatched = [];

    for (const item of letterItems) {
      if (INDEPENDENT_VOWEL_CHARS.includes(item.gujarati_text)) {
        await client.query(`update content_items set unit_id = $1 where id = $2`, [vowelsUnitId, item.id]);
        vowelCount += 1;
      } else if (CONSONANT_CHARS.includes(item.gujarati_text)) {
        await client.query(`update content_items set unit_id = $1 where id = $2`, [consonantsUnitId, item.id]);
        consonantCount += 1;
      } else {
        unmatched.push(item);
      }
    }

    console.log(`Reassigned ${vowelCount} vowel(s), ${consonantCount} consonant(s).`);
    if (unmatched.length > 0) {
      console.warn(
        `WARNING: ${unmatched.length} letter item(s) matched neither list, left on the old unit:`,
        unmatched,
      );
    }

    // Only drop the old unit once nothing references it any more.
    const { rows: remaining } = await client.query(
      `select count(*) as n from content_items where unit_id = $1`,
      [oldUnitId],
    );
    if (Number(remaining[0].n) === 0) {
      await client.query(`delete from content_units where id = $1`, [oldUnitId]);
      console.log('Old "Letters" unit deleted (0 content_items referenced it).');
    } else {
      console.warn(
        `Old "Letters" unit NOT deleted -- ${remaining[0].n} content_items row(s) still reference it ` +
          `(see unmatched list above).`,
      );
    }
  }

  // Tag existing word-chapter units for the 'vocabulary' module.
  // (Also covered by the migration's backfill, but re-run here
  // defensively in case a unit was created between the migration and
  // this script.)
  const { rowCount } = await client.query(
    `update content_units set module = 'vocabulary' where unit_type = 'words' and module is distinct from 'vocabulary'`,
  );
  console.log(`Tagged ${rowCount} word-chapter unit(s) as module='vocabulary'.`);
} finally {
  await client.end();
}
