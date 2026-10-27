import {
  LOOK_KEY_MAX_CHOSEN_LENGTH,
  LOOK_KEY_MAX_LENGTH,
  LOOK_KEY_PATTERN,
  LOOK_KEY_PREFIX,
} from './limits';

/** The suffix of a look's other Cart Discounts: `-DE`, or `-ALL` for the
 *  discount of prices without a country. A look key must not end this way,
 *  so a discount key always names exactly one look. */
const DISCOUNT_COUNTRY_SUFFIX = /-([A-Z]{2}|ALL)$/;

/** A key the user typed is usable: shared key rule (letters, digits, `-`,
 *  `_`), after trimming. */
export function isValidLookKey(key: string): boolean {
  const trimmed = key.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= LOOK_KEY_MAX_CHOSEN_LENGTH &&
    LOOK_KEY_PATTERN.test(trimmed) &&
    !DISCOUNT_COUNTRY_SUFFIX.test(trimmed)
  );
}

/**
 * The Cart Discount key of a look's country group. The first group is the
 * look's main discount, keyed `look-<lookKey>`; the others add the country
 * (`look-<lookKey>-DE`, `-ALL` for prices without a country).
 */
export function lookDiscountKey(
  lookKey: string,
  country: string,
  isMain: boolean
): string {
  return isMain
    ? lookObjectKey(lookKey)
    : `${lookObjectKey(lookKey)}-${country || 'ALL'}`;
}

/** The look key a Cart Discount key belongs to (main or country discount). */
export function lookKeyFromDiscountKey(
  discountKey: string | null | undefined
): string | undefined {
  const base = lookKeyFromObjectKey(discountKey);
  if (!base) return undefined;
  return base.replace(DISCOUNT_COUNTRY_SUFFIX, '') || base;
}

/** True for `look-<lookKey>-DE`, a country discount (not the main one). */
export const isCountryDiscountKey = (discountKey: string): boolean => {
  const base = lookKeyFromObjectKey(discountKey);
  return base !== undefined && DISCOUNT_COUNTRY_SUFFIX.test(base);
};

/** `look-<lookKey>`, shared by the Custom Object and its Cart Discount. */
export function lookObjectKey(lookKey: string): string {
  return `${LOOK_KEY_PREFIX}${lookKey}`;
}

/** The look key inside `look-<lookKey>`, or `undefined` for any other key. */
export function lookKeyFromObjectKey(
  objectKey: string | null | undefined
): string | undefined {
  if (!objectKey || !objectKey.startsWith(LOOK_KEY_PREFIX)) return undefined;
  const lookKey = objectKey.slice(LOOK_KEY_PREFIX.length);
  return lookKey.length > 0 ? lookKey : undefined;
}

const TRANSLITERATIONS: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  Ä: 'ae',
  Ö: 'oe',
  Ü: 'ue',
  ß: 'ss',
};

/** Lowercase ASCII letters, digits and single hyphens; umlauts and `ß`
 *  transliterated, other accents stripped. */
export function slugify(text: string): string {
  return text
    .replace(/[äöüÄÖÜß]/g, (ch) => TRANSLITERATIONS[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function truncate(value: string, maxLength: number): string {
  return value.slice(0, maxLength).replace(/-+$/, '');
}

/**
 * The slug of the English name, at most `LOOK_KEY_MAX_LENGTH` characters,
 * with `-2`, `-3`, ... appended while the key is in `taken` (look keys
 * without the prefix).
 */
export function deriveLookKey(nameEn: string, taken: Set<string>): string {
  const base = slugify(nameEn) || 'look';
  for (let n = 1; ; n += 1) {
    const suffix = n === 1 ? '' : `-${n}`;
    const candidate = `${truncate(
      base,
      LOOK_KEY_MAX_LENGTH - suffix.length
    )}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * The name the look key is derived from: the English name, else the German
 * one, else the first translation (project language order).
 */
export function keySourceName(label: Record<string, string>): string {
  const entries = Object.entries(label).filter(([, text]) => text.trim());
  const pick = (prefix: string) =>
    entries.find(
      ([locale]) => locale === prefix || locale.startsWith(`${prefix}-`)
    );
  return (pick('en') ?? pick('de') ?? entries[0])?.[1] ?? '';
}
