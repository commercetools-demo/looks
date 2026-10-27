import { LOOK_KEY_MAX_LENGTH, LOOK_KEY_PREFIX } from './limits';

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
