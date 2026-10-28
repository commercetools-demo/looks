/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Money } from './types';
import {
  countriesOf,
  listPricesOf,
  livePricesOfVariants,
  lookPriceKeys,
  priceKey,
  referenceMoney,
  referencePrice,
  savingPercent,
  sortPriceKeys,
  splitPriceKey,
  sumListPrices,
} from './prices';

const now = Date.parse('2026-10-27T12:00:00Z');

const price = (
  currencyCode: string,
  centAmount: number,
  country?: string,
  extra: Record<string, unknown> = {}
) => ({
  value: { currencyCode, centAmount },
  ...(country ? { country } : {}),
  ...extra,
});

/** The project example: EUR per country, GBP with a customer-group price and
 *  expired time-limited prices. */
const projectPrices = [
  price('EUR', 3299, 'DE'),
  price('EUR', 2639, 'FR'),
  price('GBP', 3000, 'GB', { customerGroupRef: { id: 'vip' } }),
  price('GBP', 2899, 'GB', {
    validFrom: '2025-09-29T13:55:00.000Z',
    validUntil: '2025-09-29T14:00:00.000Z',
  }),
  price('GBP', 3199, 'GB'),
  price('GBP', 2999, 'GB', {
    validFrom: '2025-09-30T14:00:00.000Z',
    validUntil: '2025-09-30T15:00:00.000Z',
  }),
];

describe('price cell keys', () => {
  it('joins currency and country, or is the currency alone', () => {
    expect(priceKey('EUR', 'DE')).toBe('EUR/DE');
    expect(priceKey('EUR')).toBe('EUR');
    expect(priceKey('EUR', '')).toBe('EUR');
    expect(priceKey('EUR', null)).toBe('EUR');
  });

  it('splits a key back', () => {
    expect(splitPriceKey('EUR/DE')).toEqual({ currency: 'EUR', country: 'DE' });
    expect(splitPriceKey('CHF')).toEqual({ currency: 'CHF', country: '' });
  });

  it('sorts by project currency order, then country with no country first', () => {
    expect(
      sortPriceKeys(
        ['GBP/GB', 'EUR/FR', 'EUR', 'EUR/DE', 'USD/US', 'EUR/DE'],
        ['EUR', 'GBP']
      )
    ).toEqual(['EUR', 'EUR/DE', 'EUR/FR', 'GBP/GB', 'USD/US']);
  });

  it('lists the countries of a set of cells, no country first', () => {
    expect(countriesOf(['EUR/FR', 'EUR/DE', 'GBP/GB', 'CHF', 'EUR'])).toEqual([
      '',
      'DE',
      'FR',
      'GB',
    ]);
  });
});

describe('listPricesOf', () => {
  it('reads the project example per currency and country', () => {
    expect(listPricesOf(projectPrices, ['EUR', 'GBP'], now)).toEqual({
      'EUR/DE': 3299,
      'EUR/FR': 2639,
      'GBP/GB': 3199,
    });
  });

  it('keeps only the given project currencies', () => {
    expect(listPricesOf(projectPrices, ['EUR'], now)).toEqual({
      'EUR/DE': 3299,
      'EUR/FR': 2639,
    });
    expect(listPricesOf(projectPrices, ['USD'], now)).toEqual({});
  });

  it('keys prices without a country by the currency alone', () => {
    expect(
      listPricesOf([price('EUR', 9999), price('CHF', 10990)], ['EUR', 'CHF'])
    ).toEqual({ EUR: 9999, CHF: 10990 });
  });

  it('never uses a price restricted to a customer group or channel', () => {
    expect(
      listPricesOf(
        [
          price('EUR', 700, 'DE', { customerGroupRef: { id: 'g' } }),
          price('EUR', 600, undefined, { channelRef: { id: 'c' } }),
        ],
        ['EUR']
      )
    ).toEqual({});
  });

  it('lets a time-limited price win within its cell while it applies', () => {
    const limited = price('GBP', 2500, 'GB', {
      validFrom: '2026-10-01T00:00:00Z',
      validUntil: '2026-11-01T00:00:00Z',
    });
    expect(
      listPricesOf([price('GBP', 3199, 'GB'), limited], ['GBP'], now)
    ).toEqual({ 'GBP/GB': 2500 });
    expect(
      listPricesOf([limited, price('GBP', 3199, 'GB')], ['GBP'], now)
    ).toEqual({ 'GBP/GB': 2500 });
  });

  it('ignores a price that starts later or has ended', () => {
    expect(
      listPricesOf(
        [price('GBP', 2500, 'GB', { validFrom: '2027-01-01T00:00:00Z' })],
        ['GBP'],
        now
      )
    ).toEqual({});
    expect(
      listPricesOf(
        [price('GBP', 2500, 'GB', { validUntil: '2026-10-27T12:00:00Z' })],
        ['GBP'],
        now
      )
    ).toEqual({});
  });

  it('handles missing price lists', () => {
    expect(listPricesOf(undefined, ['EUR'])).toEqual({});
    expect(listPricesOf(null, ['EUR'])).toEqual({});
  });
});

describe('livePricesOfVariants', () => {
  it('takes the master first and adds cells only other variants have', () => {
    expect(
      livePricesOfVariants(
        [
          { prices: [price('EUR', 100, 'DE')] },
          { prices: [price('EUR', 999, 'DE'), price('EUR', 80, 'FR')] },
          { prices: null },
        ],
        ['EUR'],
        now
      )
    ).toEqual({ 'EUR/DE': 100, 'EUR/FR': 80 });
  });
});

describe('reference prices', () => {
  const money: Money = { 'EUR/DE': 3299, 'EUR/FR': 2639, 'GBP/GB': 3199 };

  it('takes the own cell, else the first country cell of the currency', () => {
    expect(referencePrice({ EUR: 5, 'EUR/DE': 1 }, 'EUR')).toBe(5);
    expect(referencePrice(money, 'EUR')).toBe(3299);
    expect(referencePrice(money, 'GBP')).toBe(3199);
    expect(referencePrice(money, 'CHF')).toBeUndefined();
    expect(referencePrice(undefined, 'EUR')).toBeUndefined();
  });

  it('gives one amount per project currency', () => {
    expect(referenceMoney(money, ['EUR', 'GBP', 'CHF'])).toEqual({
      EUR: 3299,
      GBP: 3199,
    });
    expect(referenceMoney(undefined, ['EUR'])).toEqual({});
  });
});

describe('lookPriceKeys and sumListPrices', () => {
  const live = new Map<string, Money>([
    ['a', { 'EUR/DE': 3299, 'EUR/FR': 2639, 'GBP/GB': 3199 }],
    ['b', { 'EUR/DE': 1000, 'GBP/GB': 500 }],
  ]);

  it('lists every cell any piece has, in display order', () => {
    expect(lookPriceKeys(['a', 'b'], live, ['EUR', 'GBP'])).toEqual([
      'EUR/DE',
      'EUR/FR',
      'GBP/GB',
    ]);
    expect(lookPriceKeys(['x'], live, ['EUR'])).toEqual([]);
  });

  it('sums per cell and omits a cell when a piece lacks a price in it', () => {
    const keys = lookPriceKeys(['a', 'b'], live, ['EUR', 'GBP']);
    expect(sumListPrices(['a', 'b'], live, keys)).toEqual({
      'EUR/DE': 4299,
      'GBP/GB': 3699,
    });
    expect(sumListPrices([], live, keys)).toEqual({});
    expect(sumListPrices(['a', 'unknown'], live, keys)).toEqual({});
  });
});

describe('savingPercent', () => {
  it('computes the saving in percent', () => {
    expect(savingPercent(29596, 26590)).toBe(10);
    expect(savingPercent(undefined, 100)).toBeUndefined();
    expect(savingPercent(100, undefined)).toBeUndefined();
  });
});
