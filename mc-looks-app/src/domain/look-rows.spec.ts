import {
  buildDiscount,
  buildObject,
  buildPiece,
  CURRENCIES,
} from '../test-utils/fixtures';
import {
  allPieceIds,
  buildLookRows,
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

  it('flags a project currency without a set price', () => {
    const [row] = rows([
      buildObject('x', ['a', 'b'], { setPrice: { EUR: 18000 } }),
    ]);
    expect(row.missingCurrency).toBe(true);
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
