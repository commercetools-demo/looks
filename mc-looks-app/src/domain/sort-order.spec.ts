import {
  nextSortOrder,
  nextSortOrders,
  SortOrderExhaustedError,
} from './sort-order';

describe('nextSortOrder', () => {
  it('starts at 0.7 and steps by 0.0001', () => {
    expect(nextSortOrder([])).toBe('0.7');
    expect(nextSortOrder(['0.7'])).toBe('0.7001');
    expect(nextSortOrder(['0.7', '0.7001'])).toBe('0.7002');
  });

  it('never ends in a zero: 0.701 follows 0.7009', () => {
    const taken = [
      '0.7',
      ...Array.from({ length: 9 }, (_, i) => `0.700${i + 1}`),
    ];
    expect(nextSortOrder(taken)).toBe('0.701');
  });

  it('treats 0.7000 and 0.7 as the same value and ignores other ranges', () => {
    expect(nextSortOrder(['0.7000', '0.81', '0.9', '0.00001'])).toBe('0.7001');
  });

  it('throws when all 1000 values are taken', () => {
    const all = Array.from({ length: 1000 }, (_, i) =>
      String((7000 + i) / 10000)
    );
    expect(() => nextSortOrder(all)).toThrow(SortOrderExhaustedError);
    expect(nextSortOrder(all.slice(1))).toBe('0.7');
  });
});

describe('nextSortOrders', () => {
  it('returns the lowest free values, skipping taken ones', () => {
    expect(nextSortOrders([], 3)).toEqual(['0.7', '0.7001', '0.7002']);
    expect(nextSortOrders(['0.7001'], 2)).toEqual(['0.7', '0.7002']);
  });

  it('returns nothing for a count of zero and throws when too few are free', () => {
    expect(nextSortOrders([], 0)).toEqual([]);
    const taken = Array.from({ length: 999 }, (_, i) =>
      String((7000 + i) / 10000)
    );
    expect(nextSortOrders(taken, 1)).toEqual(['0.7999']);
    expect(() => nextSortOrders(taken, 2)).toThrow(SortOrderExhaustedError);
  });
});
