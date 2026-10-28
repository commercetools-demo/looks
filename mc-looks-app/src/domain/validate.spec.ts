import type { Money, NewLook } from './types';
import { CURRENCIES } from '../test-utils/fixtures';
import { validateLook } from './validate';

const prices = new Map<string, Money>([
  ['a', { EUR: 10000, CHF: 11000 }],
  ['b', { EUR: 20000, CHF: 22000 }],
  ['c', { EUR: 30000 }],
]);

const valid: Pick<
  NewLook,
  'label' | 'componentProductIds' | 'setPrice' | 'sum'
> = {
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

  it('requires at least one name; one language is enough', () => {
    expect(codes({ ...valid, label: { de: ' ', en: '' } })).toEqual([
      'name-missing',
    ]);
    expect(codes({ ...valid, label: {} })).toEqual(['name-missing']);
    expect(codes({ ...valid, label: { de: ' ', en: 'x' } })).toEqual([]);
    expect(codes({ ...valid, label: { fr: 'x' } })).toEqual([]);
  });

  it('requires at least 2 pieces and has no upper limit', () => {
    const prices = (ids: string[]) =>
      new Map(ids.map((id) => [id, { EUR: 100, CHF: 100 }]));
    expect(codes({ ...valid, componentProductIds: [] })).toContain(
      'pieces-count'
    );
    expect(codes({ ...valid, componentProductIds: ['a'] })).toContain(
      'pieces-count'
    );
    for (const count of [2, 5, 6, 10]) {
      const ids = Array.from({ length: count }, (_, i) => `p${i}`);
      expect(
        codes({ ...valid, componentProductIds: ids }, prices(ids))
      ).not.toContain('pieces-count');
    }
  });

  it('rejects duplicate pieces', () => {
    expect(codes({ ...valid, componentProductIds: ['a', 'a'] })).toContain(
      'piece-duplicate'
    );
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

  it('checks only cells with a set price and a live sum', () => {
    expect(
      validateLook(
        { ...valid, setPrice: { EUR: 27000 }, sum: { EUR: 30000 } },
        prices,
        ['EUR', 'CHF']
      )
    ).toEqual([]);
    // USD has neither a live sum nor a set price: ignored
    expect(validateLook(valid, prices, ['EUR', 'CHF', 'USD'])).toEqual([]);
  });

  it('ignores a cell some piece has no price in, even with a set price', () => {
    const live = new Map<string, Money>([
      ['a', { EUR: 10000, CHF: 11000 }],
      ['c', { EUR: 30000 }],
    ]);
    expect(
      validateLook(
        {
          ...valid,
          componentProductIds: ['a', 'c'],
          sum: { EUR: 40000 },
        },
        live,
        CURRENCIES
      ).map((e) => e.code)
    ).toEqual([]);
  });

  it('works per currency and country cell and names the cell', () => {
    const live = new Map<string, Money>([
      ['a', { 'EUR/DE': 3299, 'EUR/FR': 2639, 'GBP/GB': 3199 }],
      ['b', { 'EUR/DE': 1000, 'EUR/FR': 1000, 'GBP/GB': 1000 }],
    ]);
    const keys = ['EUR/DE', 'EUR/FR', 'GBP/GB'];
    const look = {
      ...valid,
      setPrice: { 'EUR/DE': 4000, 'EUR/FR': 3639, 'GBP/GB': 4000 },
      sum: { 'EUR/DE': 4299, 'EUR/FR': 3639, 'GBP/GB': 4199 },
    };
    expect(validateLook(look, live, keys)).toEqual([
      {
        code: 'set-price-not-below-sum',
        field: 'setPrice',
        currency: 'EUR/FR',
      },
    ]);
    // a cell without a set price is left out
    expect(
      validateLook({ ...look, setPrice: { 'EUR/DE': 4000 } }, live, keys)
    ).toEqual([]);
  });

  it('requires a set price in at least one cell', () => {
    expect(codes({ ...valid, setPrice: {} })).toEqual(['set-price-none']);
    expect(codes(valid, new Map(), CURRENCIES)).toEqual(['set-price-none']);
    expect(
      codes({ ...valid, componentProductIds: ['a', 'c'], setPrice: { CHF: 1 } })
    ).toEqual(['set-price-none']);
  });

  it('checks a chosen key, and ignores the key when none was chosen', () => {
    expect(codes({ ...valid, key: 'my-key_1' } as never)).toEqual([]);
    expect(codes({ ...valid, key: 'bad key' } as never)).toEqual([
      'key-invalid',
    ]);
    expect(codes({ ...valid, key: '' } as never)).toEqual(['key-invalid']);
    expect(codes(valid)).toEqual([]);
  });
});
