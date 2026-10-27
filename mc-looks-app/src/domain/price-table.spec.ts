import {
  parsePercent,
  percentOf,
  priceFromPercent,
  priceTableRows,
} from './price-table';

describe('priceTableRows', () => {
  const pieces: Array<{ id: string; prices: Record<string, number> }> = [
    {
      id: 'a',
      prices: { 'EUR/DE': 3299, 'EUR/FR': 2639, 'GBP/GB': 3199, 'CHF/CH': 1 },
    },
    { id: 'b', prices: { 'EUR/DE': 1000, 'EUR/FR': 900, 'GBP/GB': 500 } },
  ];

  it('has a row per cell all pieces have a price in, by currency then country', () => {
    expect(priceTableRows(pieces, ['GBP', 'EUR', 'CHF'])).toEqual([
      {
        key: 'GBP/GB',
        currency: 'GBP',
        country: 'GB',
        prices: [3199, 500],
        sum: 3699,
      },
      {
        key: 'EUR/DE',
        currency: 'EUR',
        country: 'DE',
        prices: [3299, 1000],
        sum: 4299,
      },
      {
        key: 'EUR/FR',
        currency: 'EUR',
        country: 'FR',
        prices: [2639, 900],
        sum: 3539,
      },
    ]);
  });

  it('leaves out cells a piece has no price in, and has no rows without pieces', () => {
    expect(
      priceTableRows(pieces, ['CHF', 'EUR']).map((row) => row.key)
    ).toEqual(['EUR/DE', 'EUR/FR', 'GBP/GB']);
    expect(priceTableRows([], ['EUR'])).toEqual([]);
  });

  it('gives a cell without country an empty country', () => {
    expect(
      priceTableRows([{ id: 'a', prices: { EUR: 100 } }], ['EUR'])
    ).toEqual([
      { key: 'EUR', currency: 'EUR', country: '', prices: [100], sum: 100 },
    ]);
  });
});

describe('percent helpers', () => {
  it('computes the set price for a saving in percent', () => {
    expect(priceFromPercent(10000, 15)).toBe(8500);
    expect(priceFromPercent(3299, 10)).toBe(2969);
    expect(priceFromPercent(3299, 0)).toBe(3299);
  });

  it('computes the saving with one decimal, only for real savings', () => {
    expect(percentOf(10000, 8500)).toBe(15);
    expect(percentOf(3299, 2969)).toBe(10);
    expect(percentOf(10000, 8750)).toBe(12.5);
    expect(percentOf(10000, 10000)).toBeUndefined();
    expect(percentOf(10000, 12000)).toBeUndefined();
    expect(percentOf(10000, 0)).toBeUndefined();
    expect(percentOf(undefined, 100)).toBeUndefined();
    expect(percentOf(0, 100)).toBeUndefined();
    expect(percentOf(100, undefined)).toBeUndefined();
  });

  it('parses a typed percentage with comma or dot, at most 99.9', () => {
    expect(parsePercent('15')).toBe(15);
    expect(parsePercent(' 12,5 ')).toBe(12.5);
    expect(parsePercent('12.5')).toBe(12.5);
    expect(parsePercent('99.9')).toBe(99.9);
    expect(parsePercent('0')).toBe(0);
    expect(parsePercent('100')).toBeUndefined();
    expect(parsePercent('12,55')).toBeUndefined();
    expect(parsePercent('-5')).toBeUndefined();
    expect(parsePercent('abc')).toBeUndefined();
    expect(parsePercent('')).toBeUndefined();
  });
});
