import {
  buildDiscount,
  buildObject,
  buildPiece,
  CURRENCIES,
} from '../test-utils/fixtures';
import {
  allPieceIds,
  buildLookRows,
  discountForKey,
  isPastLook,
  takenLookKeys,
} from './look-rows';

const pieces = new Map([
  ['a', buildPiece('a', { prices: { EUR: 10000, CHF: 11000 } })],
  ['b', buildPiece('b', { prices: { EUR: 20000, CHF: 22000 } })],
]);

const rows = (
  objects = [buildObject('x', ['a', 'b'])],
  discounts = [buildDiscount('x', ['a', 'b'])]
) => buildLookRows({ objects, discounts, pieces, currencies: CURRENCIES });

describe('buildLookRows', () => {
  it('joins object and discount into a complete row', () => {
    const [row] = rows();
    expect(row).toMatchObject({
      lookKey: 'x',
      objectKey: 'look-x',
      completeness: 'complete',
      isActive: true,
      liveSum: { EUR: 30000, CHF: 33000 },
      setPrice: { EUR: 18000, CHF: 19800 },
      savingPercent: 40,
      name: { de: 'x de', en: 'x en' },
    });
  });

  it('shows no drift while sum minus discount equals the set price', () => {
    const [row] = rows([
      buildObject('x', ['a', 'b'], { setPrice: { EUR: 28000, CHF: 30800 } }),
    ]);
    expect(row.priceDrift).toBe(false);
  });

  it('detects drift when the live sum minus the discount no longer equals the set price', () => {
    const [row] = rows([
      buildObject('x', ['a', 'b'], { setPrice: { EUR: 27000, CHF: 30800 } }),
    ]);
    expect(row.priceDrift).toBe(true);
  });

  it('marks a missing discount, a missing object and inconsistent pieces', () => {
    expect(rows([buildObject('x', ['a', 'b'])], [])[0].completeness).toBe(
      'missing-discount'
    );
    expect(rows([], [buildDiscount('x', ['a', 'b'])])[0].completeness).toBe(
      'missing-object'
    );
    expect(
      rows([buildObject('x', ['a', 'b'])], [buildDiscount('x', ['a'])])[0]
        .completeness
    ).toBe('inconsistent');
  });

  it('takes pieces from the discount when the object is missing', () => {
    expect(rows([], [buildDiscount('x', ['a', 'b'])])[0].pieceIds).toEqual([
      'a',
      'b',
    ]);
  });

  it('ignores discounts and objects outside the look key space', () => {
    const result = rows(
      [buildObject('x', ['a', 'b'])],
      [
        buildDiscount('x', ['a', 'b']),
        { ...buildDiscount('y', ['a']), key: 'promo-1' },
      ]
    );
    expect(result).toHaveLength(1);
  });

  it('leaves the sum out while pieces are not loaded', () => {
    const [row] = buildLookRows({
      objects: [buildObject('x', ['a', 'b'])],
      discounts: [buildDiscount('x', ['a', 'b'])],
      pieces: new Map(),
      currencies: CURRENCIES,
    });
    expect(row.liveSum).toEqual({});
    expect(row.priceDrift).toBe(false);
    expect(row.savingPercent).toBeUndefined();
  });

  it('takes the status from the discount and classifies past looks', () => {
    const [row] = rows(
      [buildObject('x', ['a', 'b'])],
      [buildDiscount('x', ['a', 'b'], { isActive: false })]
    );
    expect(row.isActive).toBe(false);
    expect(isPastLook(row)).toBe(true);
    expect(isPastLook(rows([buildObject('x', ['a', 'b'])], [])[0])).toBe(false);
  });
});

describe('helpers', () => {
  it('collects piece ids and taken keys', () => {
    const objects = [buildObject('x', ['a', 'b'])];
    const discounts = [
      buildDiscount('x', ['a', 'b']),
      buildDiscount('z', ['c']),
    ];
    expect(allPieceIds(objects, discounts).sort()).toEqual(['a', 'b', 'c']);
    expect([...takenLookKeys(objects, discounts)].sort()).toEqual(['x', 'z']);
  });
});

describe('buildLookRows with country discounts', () => {
  const cellPieces = new Map([
    [
      'a',
      buildPiece('a', {
        prices: { 'EUR/DE': 3299, 'EUR/FR': 2639, 'GBP/GB': 3199 },
      }),
    ],
    [
      'b',
      buildPiece('b', {
        prices: { 'EUR/DE': 1000, 'EUR/FR': 1000, 'GBP/GB': 1000 },
      }),
    ],
  ]);
  const setPrice = { 'EUR/DE': 4000, 'EUR/FR': 3000, 'GBP/GB': 3500 };
  const object = buildObject('x', ['a', 'b'], { setPrice });
  const main = buildDiscount('x', ['a', 'b'], {
    country: 'DE',
    amount: { EUR: 299 },
  });
  const fr = (amount: number) =>
    buildDiscount('x', ['a', 'b'], {
      id: 'disc-x-fr',
      key: 'look-x-FR',
      country: 'FR',
      amount: { EUR: amount },
    });
  const gb = buildDiscount('x', ['a', 'b'], {
    id: 'disc-x-gb',
    key: 'look-x-GB',
    country: 'GB',
    amount: { GBP: 699 },
  });
  const build = (discounts = [main, fr(639), gb]) =>
    buildLookRows({
      objects: [object],
      discounts,
      pieces: cellPieces,
      currencies: ['EUR', 'GBP'],
    });

  it('has one row with the main discount and the country discounts', () => {
    const rows = build();
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row.discount?.id).toBe('disc-x');
    expect(row.countryDiscounts.map((d) => d.key)).toEqual([
      'look-x-FR',
      'look-x-GB',
    ]);
    expect(row.completeness).toBe('complete');
    expect(row.liveSum).toEqual({
      'EUR/DE': 4299,
      'EUR/FR': 3639,
      'GBP/GB': 4199,
    });
    expect(row.referenceSum).toEqual({ EUR: 4299, GBP: 4199 });
    expect(row.referenceSetPrice).toEqual({ EUR: 4000, GBP: 3500 });
    expect(row.priceDrift).toBe(false);
  });

  it('takes the status from the main discount only', () => {
    const [row] = build([
      main,
      { ...fr(639), isActive: false },
      { ...gb, isActive: false },
    ]);
    expect(row.isActive).toBe(true);
    const [off] = build([{ ...main, isActive: false }, fr(639), gb]);
    expect(off.isActive).toBe(false);
  });

  it('finds the discount of a cell by country', () => {
    const [row] = build();
    expect(discountForKey(row, 'EUR/DE')?.id).toBe('disc-x');
    expect(discountForKey(row, 'EUR/FR')?.id).toBe('disc-x-fr');
    expect(discountForKey(row, 'GBP/GB')?.id).toBe('disc-x-gb');
    expect(discountForKey(row, 'EUR/IT')).toBeUndefined();
  });

  it('detects drift in one country against that country discount', () => {
    expect(build([main, fr(600), gb])[0].priceDrift).toBe(true);
  });

  it('shows drift when a country with a set price has no discount', () => {
    expect(build([main, gb])[0].priceDrift).toBe(true);
  });

  it('does not report drift for a priced cell without a set price', () => {
    const [row] = buildLookRows({
      objects: [buildObject('x', ['a', 'b'], { setPrice: { 'EUR/DE': 4000 } })],
      discounts: [main],
      pieces: cellPieces,
      currencies: ['EUR', 'GBP'],
    });
    expect(row.priceDrift).toBe(false);
  });

  it('does not create rows or taken keys apart from the look', () => {
    expect(build()).toHaveLength(1);
    const orphan = buildLookRows({
      objects: [],
      discounts: [fr(639)],
      pieces: cellPieces,
      currencies: ['EUR'],
    });
    expect(orphan.map((r) => r.lookKey)).toEqual(['x']);
    expect(orphan[0].completeness).toBe('missing-discount');
    expect([...takenLookKeys([object], [main, fr(639), gb])]).toEqual(['x']);
    expect(allPieceIds([object], [main, fr(639), gb]).sort()).toEqual([
      'a',
      'b',
    ]);
  });
});
