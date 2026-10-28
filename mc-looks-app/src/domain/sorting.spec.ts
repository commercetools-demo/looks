/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  buildDiscount,
  buildObject,
  buildPiece,
  CURRENCIES,
} from '../test-utils/fixtures';
import { buildLookRows } from './look-rows';
import { paginate } from './paging';
import { filterRows, sortRows } from './sorting';

const pieces = new Map([
  ['a', buildPiece('a', { prices: { EUR: 10000, CHF: 11000 } })],
  ['b', buildPiece('b', { prices: { EUR: 20000, CHF: 22000 } })],
  ['c', buildPiece('c', { prices: { EUR: 5000, CHF: 5500 } })],
]);

const make = (
  key: string,
  ids: string[],
  setEur: number,
  active = true,
  name = key
) => ({
  object: buildObject(key, ids, { setPrice: { EUR: setEur, CHF: setEur } }),
  discount: buildDiscount(key, ids, {
    isActive: active,
    name: { de: `Look-Set: ${name}` },
    description: { de: name },
  }),
});

const set = [
  make('zebra', ['a', 'b'], 27000),
  make('apple', ['a', 'c'], 9000, false),
  make('mango', ['b', 'c'], 20000),
];
const rows = buildLookRows({
  objects: set.map((s) => s.object),
  discounts: set.map((s) => s.discount),
  pieces,
  currencies: CURRENCIES,
});
const keys = (list: typeof rows) => list.map((r) => r.lookKey);
const sort = (
  key: Parameters<typeof sortRows>[1]['key'],
  direction: 'asc' | 'desc' = 'asc'
) => keys(sortRows(rows, { key, direction }, CURRENCIES, 'de'));

describe('sortRows', () => {
  it('sorts by name in both directions', () => {
    expect(sort('name')).toEqual(['apple', 'mango', 'zebra']);
    expect(sort('name', 'desc')).toEqual(['zebra', 'mango', 'apple']);
  });

  it('sorts by set price, sum, saving and status', () => {
    expect(sort('setPrice')).toEqual(['apple', 'mango', 'zebra']);
    expect(sort('sum')).toEqual(['apple', 'mango', 'zebra']);
    expect(sort('sum', 'desc')).toEqual(['zebra', 'mango', 'apple']);
    expect(sort('saving', 'desc')).toEqual(['apple', 'mango', 'zebra']);
    expect(sort('status')).toEqual(['mango', 'zebra', 'apple']);
  });

  it('puts rows without a value last in both directions', () => {
    const noSum = buildLookRows({
      objects: set.map((s) => s.object),
      discounts: set.map((s) => s.discount),
      pieces: new Map([
        ['a', pieces.get('a')!],
        ['c', pieces.get('c')!],
      ]),
      currencies: CURRENCIES,
    });
    for (const direction of ['asc', 'desc'] as const) {
      const sorted = sortRows(
        noSum,
        { key: 'sum', direction },
        CURRENCIES,
        'de'
      );
      expect(sorted[sorted.length - 1].liveSum.EUR).toBeUndefined();
    }
  });

  it('does not change its input', () => {
    const before = keys(rows);
    sortRows(rows, { key: 'name', direction: 'desc' }, CURRENCIES);
    expect(keys(rows)).toEqual(before);
  });
});

describe('filterRows', () => {
  it('filters by name, case-insensitively, over all looks', () => {
    expect(keys(filterRows(rows, 'APP', 'de'))).toEqual(['apple']);
    expect(filterRows(rows, 'nothing', 'de')).toEqual([]);
    expect(filterRows(rows, '  ', 'de')).toHaveLength(3);
  });
});

describe('paginate', () => {
  const many = Array.from({ length: 45 }, (_, i) => i);
  it('slices pages and counts them', () => {
    expect(paginate(many, 1, 20)).toMatchObject({
      page: 1,
      pageCount: 3,
      total: 45,
    });
    expect(paginate(many, 3, 20).rows).toHaveLength(5);
  });
  it('clamps the page', () => {
    expect(paginate(many, 99, 20).page).toBe(3);
    expect(paginate(many, 0, 20).page).toBe(1);
    expect(paginate([], 1, 20)).toMatchObject({
      page: 1,
      pageCount: 1,
      total: 0,
      rows: [],
    });
  });
  it('sorts and pages 1,000 looks quickly (SC-004)', () => {
    const objects = Array.from({ length: 1000 }, (_, i) =>
      buildObject(`k${i}`, ['a', 'b'], {
        setPrice: { EUR: 100 + i, CHF: 100 + i },
      })
    );
    const discounts = objects.map((_o, i) =>
      buildDiscount(`k${i}`, ['a', 'b'])
    );
    const big = buildLookRows({
      objects,
      discounts,
      pieces,
      currencies: CURRENCIES,
    });
    const start = Date.now();
    for (const key of [
      'name',
      'setPrice',
      'sum',
      'saving',
      'status',
    ] as const) {
      expect(
        paginate(
          sortRows(big, { key, direction: 'desc' }, CURRENCIES, 'de'),
          2,
          50
        ).rows
      ).toHaveLength(50);
    }
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
