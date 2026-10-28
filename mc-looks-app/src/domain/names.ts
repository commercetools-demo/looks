/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { LocalizedValue } from './types';

/** German keeps its own prefix; every other language uses the English one. */
const SET_NAME_PREFIX = { de: 'Look-Set: ', other: 'Look set: ' } as const;

const isGerman = (locale: string) =>
  locale === 'de' || locale.startsWith('de-');

/** A localized value without empty translations (trimmed). */
export function omitEmptyTranslations(value: LocalizedValue): LocalizedValue {
  const result: LocalizedValue = {};
  for (const [locale, text] of Object.entries(value)) {
    const trimmed = text?.trim();
    if (trimmed) result[locale] = trimmed;
  }
  return result;
}

/** `Look-Set: <name>` (de) / `Look set: <name>` (every other language). */
export function buildLookDiscountName(label: LocalizedValue): LocalizedValue {
  const result: LocalizedValue = {};
  for (const [locale, text] of Object.entries(omitEmptyTranslations(label))) {
    result[locale] = `${
      isGerman(locale) ? SET_NAME_PREFIX.de : SET_NAME_PREFIX.other
    }${text}`;
  }
  return result;
}

/** The description is the plain look name. */
export function buildLookDescription(label: LocalizedValue): LocalizedValue {
  return omitEmptyTranslations(label);
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
