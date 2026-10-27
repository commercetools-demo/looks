import {
  buildDiscount,
  buildObject,
  buildPiece,
  CURRENCIES,
} from '../test-utils/fixtures';
import { buildLookRows } from './look-rows';
import {
  buildPastLooks,
  salesByDiscount,
  salesWindowStart,
  type SalesOrder,
} from './past-looks';

const pieces = new Map(['a', 'b', 'c'].map((id) => [id, buildPiece(id)]));

const order = (
  id: string,
  units: Array<{
    discountId: string;
    quantity: number;
    currency?: string;
    cents?: number;
  }>
): SalesOrder => ({
  id,
  lineItems: units.map((u) => ({
    discountedPricePerQuantity: [
      {
        quantity: u.quantity,
        discountedPrice: {
          value: {
            currencyCode: u.currency ?? 'EUR',
            centAmount: u.cents ?? 6000,
          },
          includedDiscounts: [{ discountRef: { id: u.discountId } }],
        },
      },
    ],
  })),
});

function rowsFor(
  looks: Array<{
    key: string;
    ids: string[];
    active?: boolean;
    endedAt?: string;
  }>
) {
  return buildLookRows({
    objects: looks.map((l) =>
      buildObject(l.key, l.ids, l.endedAt ? { endedAt: l.endedAt } : {})
    ),
    discounts: looks.map((l) =>
      buildDiscount(l.key, l.ids, { isActive: l.active ?? false })
    ),
    pieces,
    currencies: CURRENCIES,
  });
}

describe('salesByDiscount', () => {
  it('counts units, orders and revenue per currency by discount id', () => {
    const sales = salesByDiscount(
      [
        order('o1', [{ discountId: 'disc-x', quantity: 3 }]),
        order('o2', [
          { discountId: 'disc-x', quantity: 3 },
          { discountId: 'disc-x', quantity: 3, currency: 'CHF', cents: 7000 },
        ]),
        order('o3', [{ discountId: 'other', quantity: 9 }]),
      ],
      new Set(['disc-x'])
    );
    expect(sales.get('disc-x')).toEqual({
      orders: 2,
      units: 9,
      revenue: { EUR: 36000, CHF: 21000 },
    });
    expect(sales.has('other')).toBe(false);
  });
});

describe('buildPastLooks', () => {
  it('lists only complete inactive looks with sets = floor(units / pieces)', () => {
    const rows = rowsFor([
      { key: 'x', ids: ['a', 'b', 'c'] },
      { key: 'live', ids: ['a', 'b'], active: true },
    ]);
    const past = buildPastLooks(rows, [
      order('o1', [{ discountId: 'disc-x', quantity: 3 }]),
      order('o2', [{ discountId: 'disc-x', quantity: 6 }]),
    ]);
    expect(past).toHaveLength(1);
    expect(past[0]).toMatchObject({
      lookKey: 'x',
      orders: 2,
      setsSold: 3,
      pieceCount: 3,
    });
  });

  it('sorts best seller first, then by name; unsold looks show zeros', () => {
    const rows = rowsFor([
      { key: 'beta', ids: ['a', 'b'] },
      { key: 'alpha', ids: ['a', 'b'] },
      { key: 'gamma', ids: ['a', 'b'] },
    ]);
    const past = buildPastLooks(
      rows,
      [
        order('o1', [{ discountId: 'disc-gamma', quantity: 10 }]),
        order('o2', [{ discountId: 'disc-beta', quantity: 4 }]),
      ],
      'de'
    );
    expect(past.map((p) => [p.lookKey, p.setsSold])).toEqual([
      ['gamma', 5],
      ['beta', 2],
      ['alpha', 0],
    ]);
    expect(past[2].revenue).toEqual({});
  });

  it('uses the recorded end date, never the last-modified date', () => {
    const [withEnd, without] = [
      buildPastLooks(
        rowsFor([
          { key: 'x', ids: ['a', 'b'], endedAt: '2026-10-06T10:00:00.000Z' },
        ]),
        []
      )[0],
      buildPastLooks(rowsFor([{ key: 'x', ids: ['a', 'b'] }]), [])[0],
    ];
    expect(withEnd.activeFrom).toBe('2026-09-30T08:00:00.000Z');
    expect(withEnd.activeUntil).toBe('2026-10-06T10:00:00.000Z');
    expect(without.activeUntil).toBeUndefined();
  });

  it('starts the sales window 90 days back', () => {
    expect(salesWindowStart(new Date('2026-10-27T00:00:00.000Z'))).toBe(
      '2026-07-29T00:00:00.000Z'
    );
  });
});

describe('buildPastLooks with country discounts', () => {
  it('adds up the sales of all country discounts of a look', () => {
    const rows = buildLookRows({
      objects: [buildObject('x', ['a', 'b'])],
      discounts: [
        buildDiscount('x', ['a', 'b'], { isActive: false, country: 'DE' }),
        buildDiscount('x', ['a', 'b'], {
          id: 'disc-x-fr',
          key: 'look-x-FR',
          isActive: false,
          country: 'FR',
        }),
      ],
      pieces,
      currencies: CURRENCIES,
    });
    expect(rows).toHaveLength(1);
    const past = buildPastLooks(rows, [
      order('o1', [{ discountId: 'disc-x', quantity: 2 }]),
      order('o2', [{ discountId: 'disc-x-fr', quantity: 4, cents: 5000 }]),
      order('o3', [
        { discountId: 'disc-x', quantity: 2 },
        { discountId: 'disc-x-fr', quantity: 2, cents: 5000 },
      ]),
    ]);
    expect(past).toHaveLength(1);
    expect(past[0]).toMatchObject({
      discountId: 'disc-x',
      countryDiscountIds: ['disc-x-fr'],
      orders: 4,
      setsSold: 5,
      revenue: { EUR: 2 * 6000 + 4 * 5000 + 2 * 6000 + 2 * 5000 },
    });
  });
});
