/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/** One `SearchQueryInput` of the product search: what a typed text is matched
 *  against. */
export type PieceSearchQuery = Record<string, unknown>;

const wildcard = (field: string, value: string, extra = {}) => ({
  wildcard: { field, value, caseInsensitive: true, ...extra },
});

/**
 * The product search for a typed text: products whose name, description,
 * slug or search keywords (in the data language), key, product id or any
 * variant SKU contains the text. An empty text lists products that have a
 * name. (Meta title and meta description are not searchable fields of the
 * product search.)
 */
export function buildPieceSearchQuery(
  text: string,
  language: string
): PieceSearchQuery {
  const term = text.trim();
  if (!term) return { exists: { field: 'name', language } };
  const value = `*${term}*`;
  return {
    or: [
      wildcard('name', value, { language }),
      wildcard('description', value, { language }),
      wildcard('slug', value, { language }),
      wildcard('searchKeywords', value, { language }),
      wildcard('key', value),
      wildcard('id', value),
      wildcard('variants.sku', value),
    ],
  };
}
