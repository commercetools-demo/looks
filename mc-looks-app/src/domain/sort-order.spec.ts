import { nextSortOrder, SortOrderExhaustedError } from './sort-order';

describe('nextSortOrder', () => {
  it('starts at 0.7 and increments', () => {
    expect(nextSortOrder([])).toBe('0.7');
    expect(nextSortOrder(['0.7'])).toBe('0.701');
    expect(nextSortOrder(['0.7', '0.701'])).toBe('0.702');
  });

  it('never ends in a zero: 0.71 follows 0.709', () => {
    const taken = [
      '0.7',
      ...Array.from({ length: 9 }, (_, i) => `0.70${i + 1}`),
    ];
    expect(nextSortOrder(taken)).toBe('0.71');
  });

  it('treats 0.700 and 0.7 as the same value and ignores other ranges', () => {
    expect(nextSortOrder(['0.700', '0.81', '0.9'])).toBe('0.701');
  });

  it('throws when all 100 values are taken', () => {
    const all: string[] = [];
    for (let t = 700; t <= 799; t += 1) all.push((t / 1000).toString());
    expect(() => nextSortOrder(all)).toThrow(SortOrderExhaustedError);
  });
});
