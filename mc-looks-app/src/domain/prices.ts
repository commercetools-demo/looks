/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Money } from './types';

export interface RawPrice {
  value: { currencyCode: string; centAmount: number };
  country?: string | null;
  /** References only (`customerGroupRef`, `channelRef`): resolving the
   *  resources would need the customer-group and channel scopes. */
  customerGroupRef?: { id: string } | null;
  channelRef?: { id: string } | null;
  /** Time-limited prices only apply inside this window. */
  validFrom?: string | null;
  validUntil?: string | null;
}

const isValidAt = (price: RawPrice, now: number): boolean =>
  (!price.validFrom || Date.parse(price.validFrom) <= now) &&
  (!price.validUntil || Date.parse(price.validUntil) > now);

/** The key of a price cell: `<currency>/<country>` for a country price, the
 *  bare currency code for a price without a country. Prices, sums and set prices are all kept per cell. */
export const priceKey = (currency: string, country?: string | null): string =>
  country ? `${currency}/${country}` : currency;

export function splitPriceKey(key: string): {
  currency: string;
  country: string;
} {
  const [currency, country = ''] = key.split('/');
  return { currency, country };
}

/** Cells in project-currency order, then country (no country first). */
export function sortPriceKeys(keys: Iterable<string>, currencies: string[]) {
  const rank = (currency: string) => {
    const index = currencies.indexOf(currency);
    return index < 0 ? currencies.length : index;
  };
  return [...new Set(keys)].sort((a, b) => {
    const left = splitPriceKey(a);
    const right = splitPriceKey(b);
    return (
      rank(left.currency) - rank(right.currency) ||
      left.currency.localeCompare(right.currency) ||
      left.country.localeCompare(right.country)
    );
  });
}

/** The value of a currency: its own cell, else the first country cell of
 *  that currency (lists and previews show one amount per currency). */
export function referencePrice(
  money: Money | undefined,
  currency: string
): number | undefined {
  if (!money) return undefined;
  if (money[currency] !== undefined) return money[currency];
  const key = sortPriceKeys(Object.keys(money), []).find(
    (candidate) => splitPriceKey(candidate).currency === currency
  );
  return key === undefined ? undefined : money[key];
}

/** One amount per currency, taken from `referencePrice`. */
export function referenceMoney(
  money: Money | undefined,
  currencies: string[]
): Money {
  const result: Money = {};
  for (const currency of currencies) {
    const cents = referencePrice(money, currency);
    if (cents !== undefined) result[currency] = cents;
  }
  return result;
}

/** The countries a set of cells has, no-country (`''`) first. */
export const countriesOf = (keys: Iterable<string>): string[] =>
  [...new Set([...keys].map((key) => splitPriceKey(key).country))].sort();

/**
 * A variant's list prices per cell (FR-008): only prices valid now and never
 * one restricted to a customer group or channel, only in the given project
 * currencies. A time-limited price wins over the regular one of its cell.
 */
export function listPricesOf(
  prices: ReadonlyArray<RawPrice> | null | undefined,
  currencies: string[],
  now: number = Date.now()
): Money {
  const result: Money = {};
  const limited = new Set<string>();
  for (const price of prices ?? []) {
    if (
      !currencies.includes(price.value.currencyCode) ||
      price.customerGroupRef ||
      price.channelRef ||
      !isValidAt(price, now)
    ) {
      continue;
    }
    const key = priceKey(price.value.currencyCode, price.country);
    const isLimited = Boolean(price.validFrom || price.validUntil);
    if (result[key] === undefined || (isLimited && !limited.has(key))) {
      result[key] = price.value.centAmount;
      if (isLimited) limited.add(key);
    }
  }
  return result;
}

/**
 * The list prices of a product per cell: the master variant's, plus cells
 * only other variants have (some catalogs keep prices on the other variants).
 */
export function livePricesOfVariants(
  variants: ReadonlyArray<{ prices?: ReadonlyArray<RawPrice> | null }>,
  currencies: string[],
  now?: number
): Money {
  const result: Money = {};
  for (const variant of variants) {
    for (const [key, cents] of Object.entries(
      listPricesOf(variant.prices, currencies, now)
    )) {
      if (result[key] === undefined) result[key] = cents;
    }
  }
  return result;
}

/** The cells any of the pieces has a price in, in display order. */
export function lookPriceKeys(
  productIds: string[],
  livePrices: Map<string, Money>,
  currencies: string[]
): string[] {
  return sortPriceKeys(
    productIds.flatMap((id) => Object.keys(livePrices.get(id) ?? {})),
    currencies
  );
}

/**
 * The sum of the pieces' live list prices per cell. A cell is left out when
 * any piece has no price in it, so a missing price never reads as a smaller
 * sum.
 */
export function sumListPrices(
  productIds: string[],
  livePrices: Map<string, Money>,
  keys: string[]
): Money {
  const result: Money = {};
  for (const currency of keys) {
    let sum = 0;
    let complete = productIds.length > 0;
    for (const id of productIds) {
      const cents = livePrices.get(id)?.[currency];
      if (cents === undefined) {
        complete = false;
        break;
      }
      sum += cents;
    }
    if (complete) result[currency] = sum;
  }
  return result;
}

/** Saving in percent of the sum, rounded; `undefined` without a sum. */
export function savingPercent(
  sum: number | undefined,
  setPrice: number | undefined
): number | undefined {
  if (!sum || setPrice === undefined) return undefined;
  return Math.round(((sum - setPrice) / sum) * 100);
}
