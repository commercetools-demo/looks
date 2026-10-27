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
  for (const locale of localeChain(dataLocale)) {
    if (value[locale]) return value[locale];
  }
  return Object.values(value).find(Boolean);
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
