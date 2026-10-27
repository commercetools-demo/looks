import type { Money } from './types';
import {
  listPriceCents,
  livePricesOf,
  savingPercent,
  sumListPrices,
} from './prices';

const prices = [
  { value: { currencyCode: 'EUR', centAmount: 9999 } },
  { value: { currencyCode: 'EUR', centAmount: 8000 }, country: 'DE' },
  {
    value: { currencyCode: 'EUR', centAmount: 7000 },
    customerGroup: { id: 'g' },
  },
  { value: { currencyCode: 'EUR', centAmount: 6000 }, channel: { id: 'c' } },
  { value: { currencyCode: 'CHF', centAmount: 10990 } },
];

describe('prices', () => {
  it('uses only the price without country, customer group or channel', () => {
    expect(listPriceCents(prices, 'EUR')).toBe(9999);
    expect(listPriceCents(prices, 'CHF')).toBe(10990);
    expect(listPriceCents(prices, 'USD')).toBeUndefined();
    expect(
      listPriceCents(
        [{ value: { currencyCode: 'EUR', centAmount: 1 }, country: 'DE' }],
        'EUR'
      )
    ).toBeUndefined();
  });

  it('reads all given currencies', () => {
    expect(livePricesOf(prices, ['EUR', 'CHF', 'USD'])).toEqual({
      EUR: 9999,
      CHF: 10990,
    });
  });

  it('sums per currency and omits a currency when a piece lacks a price', () => {
    const live = new Map<string, Money>([
      ['a', { EUR: 100, CHF: 110 }],
      ['b', { EUR: 200 }],
    ]);
    expect(sumListPrices(['a', 'b'], live, ['EUR', 'CHF'])).toEqual({
      EUR: 300,
    });
    expect(sumListPrices([], live, ['EUR'])).toEqual({});
  });

  it('computes the saving in percent', () => {
    expect(savingPercent(29596, 26590)).toBe(10);
    expect(savingPercent(undefined, 100)).toBeUndefined();
    expect(savingPercent(100, undefined)).toBeUndefined();
  });
});
