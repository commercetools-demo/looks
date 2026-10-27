import type { LocalizedValue } from './types';

export const SET_NAME_PREFIX = { de: 'Look-Set: ', en: 'Look set: ' } as const;

/** `Look-Set: <name>` (de) / `Look set: <name>` (en). */
export function buildLookDiscountName(label: { de: string; en: string }) {
  return {
    de: `${SET_NAME_PREFIX.de}${label.de}`,
    en: `${SET_NAME_PREFIX.en}${label.en}`,
  };
}

/** The description is the plain look name. */
export function buildLookDescription(label: { de: string; en: string }) {
  return { de: label.de, en: label.en };
}

const SET_NAME = /^(?:Look-Set|Look set): (.+)$/;

/** The look name inside "Look-Set: <name>", or `undefined` for other text. */
export function lookNameFromSetName(
  name: string | undefined
): string | undefined {
  const match = name ? SET_NAME.exec(name.trim()) : null;
  return match ? match[1] : undefined;
}

/**
 * The look name per language: from `name` when it has the "Look-Set: ..."
 * form, else from `description`. Languages with neither are left out.
 */
export function lookNameFromDiscount(
  discount: { name?: LocalizedValue; description?: LocalizedValue } | undefined
): LocalizedValue | undefined {
  if (!discount) return undefined;
  const result: LocalizedValue = {};
  const languages = new Set([
    ...Object.keys(discount.name ?? {}),
    ...Object.keys(discount.description ?? {}),
  ]);
  for (const lang of languages) {
    const value =
      lookNameFromSetName(discount.name?.[lang]) ??
      (discount.description?.[lang] || undefined);
    if (value) result[lang] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
