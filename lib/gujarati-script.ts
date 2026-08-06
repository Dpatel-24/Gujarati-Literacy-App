/**
 * Gujarati script reference utility.
 *
 * Covers the 13 independent vowels, the 34 base consonants, and the
 * dependent vowel signs (matras) that attach to consonants, plus a
 * decompose() helper that breaks a single grapheme cluster (bare
 * consonant, consonant+matra, or bare vowel) into its phonetic parts.
 *
 * Conjuncts/juktakshar (consonant clusters fused via virama into one
 * glyph without a full consonant shape, e.g. ક્ષ, જ્ઞ) are explicitly
 * out of scope — decompose() flags them as isCompound and returns a
 * best-effort partial breakdown rather than a full parse.
 */

export interface VowelInfo {
  char: string;
  name: string;
  phoneticEnglish: string;
}

export interface ConsonantInfo {
  char: string;
  name: string;
  phoneticEnglish: string;
}

export interface MatraInfo {
  char: string;
  /** Name of the independent vowel this matra corresponds to. */
  vowelName: string;
  phoneticEnglish: string;
}

export interface DecomposeResult {
  consonant: string | null;
  consonantPhonetic: string | null;
  matra: string | null;
  matraName: string | null;
  isCompound: boolean;
}

/**
 * The 13 independent Gujarati vowels (સ્વર), in traditional varnamala
 * order: અ આ ઇ ઈ ઉ ઊ ઋ એ ઐ ઓ ઔ + અં અઃ. અં (anusvara-marked) and
 * અઃ (visarga-marked) are included as independent vowel forms per the
 * standard chart, even though they're technically અ + anusvara/visarga
 * rather than atomic vowel letters. ઋ (vocalic r) is a legitimate
 * independent vowel in the traditional Sanskrit-derived varnamala,
 * distinct from ર (the consonant "ra") — don't confuse the two.
 */
export const INDEPENDENT_VOWELS: readonly VowelInfo[] = [
  { char: 'અ', name: 'a', phoneticEnglish: 'a' },
  { char: 'આ', name: 'aa', phoneticEnglish: 'aa' },
  { char: 'ઇ', name: 'i', phoneticEnglish: 'i' },
  { char: 'ઈ', name: 'ii', phoneticEnglish: 'ee' },
  { char: 'ઉ', name: 'u', phoneticEnglish: 'u' },
  { char: 'ઊ', name: 'uu', phoneticEnglish: 'oo' },
  { char: 'ઋ', name: 'ri', phoneticEnglish: 'ri' },
  { char: 'એ', name: 'e', phoneticEnglish: 'e' },
  { char: 'ઐ', name: 'ai', phoneticEnglish: 'ai' },
  { char: 'ઓ', name: 'o', phoneticEnglish: 'o' },
  { char: 'ઔ', name: 'au', phoneticEnglish: 'au' },
  { char: 'અં', name: 'am', phoneticEnglish: 'am' },
  { char: 'અઃ', name: 'ah', phoneticEnglish: 'ah' },
];

/** Independent vowels keyed by their unicode char for O(1) lookup. */
export const INDEPENDENT_VOWELS_BY_CHAR: ReadonlyMap<string, VowelInfo> = new Map(
  INDEPENDENT_VOWELS.map((v) => [v.char, v]),
);

/** The 34 base Gujarati consonants, in traditional varnamala order. */
export const CONSONANTS: readonly ConsonantInfo[] = [
  { char: 'ક', name: 'ka', phoneticEnglish: 'ka' },
  { char: 'ખ', name: 'kha', phoneticEnglish: 'kha' },
  { char: 'ગ', name: 'ga', phoneticEnglish: 'ga' },
  { char: 'ઘ', name: 'gha', phoneticEnglish: 'gha' },
  { char: 'ઙ', name: 'nga', phoneticEnglish: 'nga' },
  { char: 'ચ', name: 'cha', phoneticEnglish: 'cha' },
  { char: 'છ', name: 'chha', phoneticEnglish: 'chha' },
  { char: 'જ', name: 'ja', phoneticEnglish: 'ja' },
  { char: 'ઝ', name: 'jha', phoneticEnglish: 'jha' },
  { char: 'ઞ', name: 'nya', phoneticEnglish: 'nya' },
  { char: 'ટ', name: 'tta', phoneticEnglish: 'ta' },
  { char: 'ઠ', name: 'ttha', phoneticEnglish: 'tha' },
  { char: 'ડ', name: 'dda', phoneticEnglish: 'da' },
  { char: 'ઢ', name: 'ddha', phoneticEnglish: 'dha' },
  { char: 'ણ', name: 'nna', phoneticEnglish: 'na' },
  { char: 'ત', name: 'ta', phoneticEnglish: 'ta' },
  { char: 'થ', name: 'tha', phoneticEnglish: 'tha' },
  { char: 'દ', name: 'da', phoneticEnglish: 'da' },
  { char: 'ધ', name: 'dha', phoneticEnglish: 'dha' },
  { char: 'ન', name: 'na', phoneticEnglish: 'na' },
  { char: 'પ', name: 'pa', phoneticEnglish: 'pa' },
  { char: 'ફ', name: 'pha', phoneticEnglish: 'fa' },
  { char: 'બ', name: 'ba', phoneticEnglish: 'ba' },
  { char: 'ભ', name: 'bha', phoneticEnglish: 'bha' },
  { char: 'મ', name: 'ma', phoneticEnglish: 'ma' },
  { char: 'ય', name: 'ya', phoneticEnglish: 'ya' },
  { char: 'ર', name: 'ra', phoneticEnglish: 'ra' },
  { char: 'લ', name: 'la', phoneticEnglish: 'la' },
  { char: 'વ', name: 'va', phoneticEnglish: 'va' },
  { char: 'શ', name: 'sha', phoneticEnglish: 'sha' },
  { char: 'ષ', name: 'ssha', phoneticEnglish: 'sha' },
  { char: 'સ', name: 'sa', phoneticEnglish: 'sa' },
  { char: 'હ', name: 'ha', phoneticEnglish: 'ha' },
  { char: 'ળ', name: 'lla', phoneticEnglish: 'la' },
];

/** Consonants keyed by their unicode char for O(1) lookup. */
export const CONSONANTS_BY_CHAR: ReadonlyMap<string, ConsonantInfo> = new Map(
  CONSONANTS.map((c) => [c.char, c]),
);

/**
 * Dependent vowel signs (matras), each mapped to the independent vowel
 * it corresponds to. ં (anusvara, U+0A82) and ઃ (visarga, U+0A83) are
 * included here as they attach to a consonant like a matra does, even
 * though they aren't vowel signs in the strict sense. ્ (virama,
 * U+0ACD) is included too since it attaches to a consonant to cancel
 * its inherent "a" vowel; it doesn't correspond to a vowel sound, so
 * its vowelName/phoneticEnglish are empty strings.
 */
export const MATRAS: readonly MatraInfo[] = [
  { char: 'ા', vowelName: 'aa', phoneticEnglish: 'aa' },
  { char: 'િ', vowelName: 'i', phoneticEnglish: 'i' },
  { char: 'ી', vowelName: 'ii', phoneticEnglish: 'ee' },
  { char: 'ુ', vowelName: 'u', phoneticEnglish: 'u' },
  { char: 'ૂ', vowelName: 'uu', phoneticEnglish: 'oo' },
  { char: 'ૃ', vowelName: 'ri', phoneticEnglish: 'ri' },
  { char: 'ે', vowelName: 'e', phoneticEnglish: 'e' },
  { char: 'ૈ', vowelName: 'ai', phoneticEnglish: 'ai' },
  { char: 'ો', vowelName: 'o', phoneticEnglish: 'o' },
  { char: 'ૌ', vowelName: 'au', phoneticEnglish: 'au' },
  { char: 'ં', vowelName: 'am', phoneticEnglish: 'am' },
  { char: 'ઃ', vowelName: 'ah', phoneticEnglish: 'ah' },
  { char: '્', vowelName: '', phoneticEnglish: '' },
];

/** Matras keyed by their unicode char for O(1) lookup. */
export const MATRAS_BY_CHAR: ReadonlyMap<string, MatraInfo> = new Map(
  MATRAS.map((m) => [m.char, m]),
);

const VIRAMA = '્';

/**
 * Splits a string into Unicode grapheme clusters using Intl.Segmenter
 * when available (Node 16+, all modern browsers), falling back to an
 * array of code points otherwise. Gujarati consonant+matra combinations
 * are a single grapheme cluster (the matra is a combining mark), so
 * this is the correct way to isolate one "letter" as a user perceives
 * it — naive string indexing or [...str] code-point splitting would
 * work here too since matras are single code points in Gujarati, but
 * Intl.Segmenter is the robust, script-agnostic way to do it and
 * matches how the rest of the app should treat text.
 */
export function toGraphemeClusters(input: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('gu', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(input), (s) => s.segment);
  }
  return Array.from(input);
}

/**
 * Decomposes a single Gujarati grapheme cluster into its phonetic
 * parts. Accepts:
 *   - a bare consonant, e.g. "ક"
 *   - a consonant + matra, e.g. "કા", "કિ"
 *   - a consonant + matra + anusvara/visarga, e.g. "ખું"
 *   - a bare independent vowel, e.g. "અ", "અં"
 *
 * Conjuncts (a consonant followed by a virama followed by another
 * consonant, fused into one unit, e.g. ક્ષ) are not fully supported —
 * isCompound is set to true and the function returns whatever partial
 * breakdown it can manage (typically the first consonant plus any
 * trailing matra) rather than throwing.
 *
 * If more than one grapheme cluster is passed in, only the first
 * cluster is decomposed.
 */
export function decompose(char: string): DecomposeResult {
  const clusters = toGraphemeClusters(char);
  const cluster = clusters[0] ?? '';

  const empty: DecomposeResult = {
    consonant: null,
    consonantPhonetic: null,
    matra: null,
    matraName: null,
    isCompound: false,
  };

  if (!cluster) {
    return empty;
  }

  // Bare independent vowel (possibly followed by anusvara/visarga
  // that's already baked into અં/અઃ as a single lookup entry, or
  // passed separately as vowel + combining mark).
  if (INDEPENDENT_VOWELS_BY_CHAR.has(cluster)) {
    const vowel = INDEPENDENT_VOWELS_BY_CHAR.get(cluster)!;
    return {
      consonant: null,
      consonantPhonetic: null,
      matra: null,
      matraName: vowel.name,
      isCompound: false,
    };
  }

  // Walk the code points within this cluster: expect an optional
  // leading consonant, followed by zero or more combining marks
  // (matra, anusvara, visarga, virama).
  const codePoints = Array.from(cluster);
  const first = codePoints[0];

  let consonant: string | null = null;
  let consonantPhonetic: string | null = null;
  let startIndex = 0;

  if (first !== undefined && CONSONANTS_BY_CHAR.has(first)) {
    const info = CONSONANTS_BY_CHAR.get(first)!;
    consonant = info.char;
    consonantPhonetic = info.phoneticEnglish;
    startIndex = 1;
  }

  const trailing = codePoints.slice(startIndex);

  // No trailing marks: bare consonant, carries its inherent "a" vowel.
  if (trailing.length === 0) {
    return {
      consonant,
      consonantPhonetic,
      matra: null,
      matraName: consonant ? 'a' : null,
      isCompound: false,
    };
  }

  // Detect a conjunct: a virama followed by another consonant shape
  // means this cluster is (at least) two consonants fused together,
  // which is out of scope for a full parse.
  const hasInternalConsonant = trailing.some(
    (cp, i) => cp === VIRAMA && trailing[i + 1] !== undefined && CONSONANTS_BY_CHAR.has(trailing[i + 1]),
  );
  if (hasInternalConsonant) {
    return {
      consonant,
      consonantPhonetic,
      matra: null,
      matraName: null,
      isCompound: true,
    };
  }

  // Single matra case (optionally followed by anusvara/visarga, e.g.
  // ખું = ખ + ુ + ં). Report the first vowel-bearing matra found; a
  // trailing anusvara/visarga on top of a vowel matra is a nasalization
  // of that vowel, not a second vowel, so it isn't reported separately
  // here — callers needing the anusvara/visarga too can re-run
  // decompose on the remaining trailing marks.
  const matraChar = trailing.find((cp) => MATRAS_BY_CHAR.has(cp));
  if (matraChar) {
    const matraInfo = MATRAS_BY_CHAR.get(matraChar)!;
    const isConjunctMarker = matraChar === VIRAMA;
    return {
      consonant,
      consonantPhonetic,
      matra: matraChar,
      matraName: isConjunctMarker ? null : matraInfo.vowelName,
      isCompound: isConjunctMarker, // bare virama with no following consonant shape found yet
    };
  }

  // Trailing marks present but unrecognized — best effort.
  return {
    consonant,
    consonantPhonetic,
    matra: trailing[0] ?? null,
    matraName: null,
    isCompound: true,
  };
}
