import type { Money } from './types';

export interface RawPrice {
  value: { currencyCode: string; centAmount: number };
  country?: string | null;
  customerGroup?: { id: string } | null;
  channel?: { id: string } | null;
}

/**
 * A piece's list price in a currency: the price in that currency without a
 * country, customer group or channel restriction (FR-008).
 */
export function listPriceCents(
  prices: ReadonlyArray<RawPrice> | null | undefined,
  currency: string
): number | undefined {
  const match = (prices ?? []).find(
    (price) =>
      price.value.currencyCode === currency &&
      !price.country &&
      !price.customerGroup &&
      !price.channel
  );
  return match?.value.centAmount;
}

/** The list prices of a variant in every given currency that has one. */
export function livePricesOf(
  prices: ReadonlyArray<RawPrice> | null | undefined,
  currencies: string[]
): Money {
  const result: Money = {};
  for (const currency of currencies) {
    const cents = listPriceCents(prices, currency);
    if (cents !== undefined) result[currency] = cents;
  }
  return result;
}

/**
 * The sum of the pieces' live list prices per currency. A currency is left
 * out when any piece has no price in it, so a missing price never reads as a
 * smaller sum.
 */
export function sumListPrices(
  productIds: string[],
  livePrices: Map<string, Money>,
  currencies: string[]
): Money {
  const result: Money = {};
  for (const currency of currencies) {
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
