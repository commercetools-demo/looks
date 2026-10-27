import type { Money } from './types';
import { CURRENCIES } from '../test-utils/fixtures';
import { validateLook } from './validate';

const prices = new Map<string, Money>([
  ['a', { EUR: 10000, CHF: 11000 }],
  ['b', { EUR: 20000, CHF: 22000 }],
  ['c', { EUR: 30000 }],
]);

const valid = {
  label: { de: 'Look', en: 'Look' },
  componentProductIds: ['a', 'b'],
  setPrice: { EUR: 27000, CHF: 29700 },
  sum: { EUR: 30000, CHF: 33000 },
};

const codes = (look = valid, p = prices, currencies = CURRENCIES) =>
  validateLook(look, p, currencies).map((e) => e.code);

describe('validateLook', () => {
  it('accepts a valid look', () => {
    expect(codes()).toEqual([]);
  });

  it('requires both names', () => {
    expect(codes({ ...valid, label: { de: ' ', en: 'x' } })).toEqual([
      'name-missing',
    ]);
    expect(codes({ ...valid, label: { de: 'x', en: '' } })).toEqual([
      'name-missing',
    ]);
  });

  it('requires 2 to 5 pieces', () => {
    expect(codes({ ...valid, componentProductIds: ['a'] })).toContain(
      'pieces-count'
    );
    const six = ['a', 'b', 'a2', 'b2', 'a3', 'b3'];
    const many = new Map(six.map((id) => [id, { EUR: 100, CHF: 100 }]));
    expect(codes({ ...valid, componentProductIds: six }, many)).toContain(
      'pieces-count'
    );
  });

  it('rejects duplicate pieces', () => {
    expect(codes({ ...valid, componentProductIds: ['a', 'a'] })).toContain(
      'piece-duplicate'
    );
  });

  it('rejects a piece without a price in a project currency', () => {
    const errors = validateLook(
      { ...valid, componentProductIds: ['a', 'c'] },
      prices,
      CURRENCIES
    );
    expect(errors).toContainEqual({
      code: 'piece-price-missing',
      field: 'pieces',
      productId: 'c',
      currency: 'CHF',
    });
  });

  it('rejects a set price that is zero, negative, fractional, or not below the sum', () => {
    expect(codes({ ...valid, setPrice: { EUR: 0, CHF: 29700 } })).toContain(
      'set-price-not-positive'
    );
    expect(codes({ ...valid, setPrice: { EUR: 30000, CHF: 29700 } })).toContain(
      'set-price-not-below-sum'
    );
    expect(codes({ ...valid, setPrice: { EUR: 31000, CHF: 29700 } })).toContain(
      'set-price-not-below-sum'
    );
    expect(codes({ ...valid, setPrice: { EUR: 100.5, CHF: 29700 } })).toContain(
      'set-price-not-positive'
    );
  });

  it('names the currency of the failing set price', () => {
    const errors = validateLook(
      { ...valid, setPrice: { EUR: 27000, CHF: 33000 } },
      prices,
      CURRENCIES
    );
    expect(errors).toEqual([
      { code: 'set-price-not-below-sum', field: 'setPrice', currency: 'CHF' },
    ]);
  });

  it('rejects a sum that is no longer the live sum', () => {
    expect(codes({ ...valid, sum: { EUR: 29999, CHF: 33000 } })).toEqual([
      'sum-not-live',
    ]);
  });

  it('rejects an invalid photo', () => {
    expect(
      codes({
        ...valid,
        image: { path: 'nope.png', width: 1, height: 1 },
      } as never)
    ).toContain('image-invalid');
    expect(
      codes({
        ...valid,
        image: { path: 'looks/x.webp', width: 0, height: 1 },
      } as never)
    ).toContain('image-invalid');
    expect(
      codes({
        ...valid,
        image: { path: 'looks/x.webp', width: 10, height: 15 },
      } as never)
    ).toEqual([]);
  });

  it('works for any number of currencies', () => {
    const one = validateLook(
      { ...valid, setPrice: { EUR: 27000 }, sum: { EUR: 30000 } },
      prices,
      ['EUR']
    );
    expect(one).toEqual([]);
    const three = validateLook(valid, prices, ['EUR', 'CHF', 'USD']);
    expect(three.map((e) => e.currency)).toContain('USD');
  });
});
