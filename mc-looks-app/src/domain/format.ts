import type { LocalizedValue } from './types';

/** The locale chain for content: data locale, then `de`, then `en`. */
export function localeChain(dataLocale: string | undefined): string[] {
  return [...new Set([dataLocale, 'de', 'en'].filter(Boolean) as string[])];
}

/**
 * A localized value in the data locale, falling back to `de`, then `en`,
 * then the first language the value has (FR-005).
 */
export function localized(
  value: LocalizedValue | undefined | null,
  dataLocale: string | undefined
): string | undefined {
  if (!value) return undefined;
  return pickLocale(value, localeChain(dataLocale));
}

/** The text for the first locale of the chain; a bare language (`de`) also
 *  matches a regional key (`de-DE`), then the first text the value has. */
export function pickLocale(
  value: Record<string, unknown>,
  locales: string[]
): string | undefined {
  const text = (key: string | undefined) =>
    key && typeof value[key] === 'string' && value[key]
      ? (value[key] as string)
      : undefined;
  for (const locale of locales) {
    const found =
      text(locale) ??
      text(Object.keys(value).find((key) => key.startsWith(`${locale}-`)));
    if (found) return found;
  }
  return Object.values(value).find(
    (entry): entry is string => typeof entry === 'string' && entry.length > 0
  );
}

/** Cent amount as money text in the given display locale. */
export function formatMoney(
  cents: number,
  currency: string,
  locale = 'de-DE'
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    cents / 100
  );
}

/** `{ locale, value }[]` (GraphQL) to a plain record. */
export function toLocalizedRecord(
  entries: ReadonlyArray<{ locale: string; value: string }> | null | undefined
): LocalizedValue {
  const record: LocalizedValue = {};
  for (const entry of entries ?? []) record[entry.locale] = entry.value;
  return record;
}
