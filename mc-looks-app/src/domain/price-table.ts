/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { lookPriceKeys, sortPriceKeys, splitPriceKey } from './prices';
import type { Money, Piece } from './types';

/** One row of the set-price table: a currency and country in which every
 *  piece has a list price, with those prices in the pieces' order and their
 *  sum. Cells where a piece has no price get no row. */
export interface PriceTableRow {
  key: string;
  currency: string;
  /** `''` for prices without a country. */
  country: string;
  prices: number[];
  sum: number;
}

export function priceTableRows(
  pieces: ReadonlyArray<Pick<Piece, 'id' | 'prices'>>,
  currencies: string[]
): PriceTableRow[] {
  const livePrices = new Map<string, Money>(
    pieces.map((piece) => [piece.id, piece.prices])
  );
  const keys = lookPriceKeys(
    pieces.map((piece) => piece.id),
    livePrices,
    currencies
  );
  // Ordered by currency (project order), then country.
  return sortPriceKeys(keys, currencies).flatMap((key) => {
    const prices = pieces.map((piece) => piece.prices[key]);
    if (prices.some((cents) => cents === undefined)) return [];
    const complete = prices as number[];
    return [
      {
        ...splitPriceKey(key),
        key,
        prices: complete,
        sum: complete.reduce((total, cents) => total + cents, 0),
      },
    ];
  });
}

/** The set price for a saving in percent of the sum, in whole cents. */
export const priceFromPercent = (sum: number, percent: number): number =>
  Math.round((sum * (100 - percent)) / 100);

/** The saving in percent (one decimal) of a set price against the sum;
 *  `undefined` without a sum or for a price that is not a saving. */
export function percentOf(
  sum: number | undefined,
  cents: number | undefined
): number | undefined {
  if (!sum || cents === undefined || cents <= 0 || cents >= sum) {
    return undefined;
  }
  return Math.round(((sum - cents) / sum) * 1000) / 10;
}

/** The percentage a price stands for: `preferred` while it still gives
 *  exactly that price (a stored percentage survives cent rounding), else
 *  `percentOf`. */
export function percentForPrice(
  sum: number | undefined,
  cents: number | undefined,
  preferred?: number
): number | undefined {
  if (
    preferred !== undefined &&
    sum !== undefined &&
    cents === priceFromPercent(sum, preferred)
  ) {
    return preferred;
  }
  return percentOf(sum, cents);
}

/** A percentage typed by a person ("15", "12,5"), at most 99.9; `undefined`
 *  for anything else. */
export function parsePercent(text: string): number | undefined {
  const match = /^(\d{1,2})(?:[.,](\d))?$/.exec(text.trim());
  if (!match) return undefined;
  return Number(`${match[1]}.${match[2] ?? '0'}`);
}
