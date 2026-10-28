import { createFakeLookApi } from '../test-utils/fake-look-api';
import { buildDiscount, buildObject, buildPiece } from '../test-utils/fixtures';
import { toLookDiscount } from '../hooks/use-looks-connector/conversion';
import { buildLookRows } from './look-rows';
import { buildLookValue } from './look-value';
import { changeSetPrice, completeLook } from './look-writes';
import { validateLook } from './validate';
import type { Money } from './types';

const pieces = new Map([
  ['a', buildPiece('a', { prices: { 'EUR/DE': 10000, 'EUR/FR': 10000 } })],
  ['b', buildPiece('b', { prices: { 'EUR/DE': 5000, 'EUR/FR': 5000 } })],
]);
const liveSum = { 'EUR/DE': 15000, 'EUR/FR': 15000 };

const setup = (
  options: {
    percents?: Record<string, number>;
    deAmount?: number;
    dePermyriad?: number;
    setPrice?: Money;
    sum?: Money;
  } = {}
) => {
  const object = buildObject('x', ['a', 'b'], {
    setPrice: options.setPrice ?? { 'EUR/DE': 12750, 'EUR/FR': 12000 },
    savingPercent: options.percents,
  });
  const de = buildDiscount('x', ['a', 'b'], {
    country: 'DE',
    amount: options.dePermyriad ? {} : { EUR: options.deAmount ?? 2250 },
    permyriad: options.dePermyriad,
  });
  const fr = buildDiscount('x', ['a', 'b'], {
    id: 'disc-x-fr',
    key: 'look-x-FR',
    country: 'FR',
    amount: { EUR: 3000 },
    sortOrder: '0.7001',
  });
  const discounts = [de, fr];
  const fake = createFakeLookApi({ objects: [object], discounts });
  const [row] = buildLookRows({
    objects: [object],
    discounts,
    pieces,
    currencies: ['EUR'],
  });
  return { fake, row };
};

describe('buildLookValue', () => {
  it('keeps savingPercent only when it has entries', () => {
    const base = { componentProductIds: ['a'], setPrice: { EUR: 1 } };
    expect(buildLookValue({ ...base, savingPercent: {} })).toEqual(base);
    expect(buildLookValue({ ...base, savingPercent: { EUR: 15 } })).toEqual({
      ...base,
      savingPercent: { EUR: 15 },
    });
  });
});

describe('toLookDiscount', () => {
  it('reads the permyriad of a relative value and leaves the amount empty', () => {
    const raw = {
      id: 'd',
      version: 1,
      key: 'look-x',
      isActive: true,
      sortOrder: '0.7',
      createdAt: '2026-10-01T00:00:00.000Z',
      cartPredicate: 'country = "DE"',
      value: {
        type: 'relativeCart',
        permyriad: 1250,
        applicationMode: 'IndividualApplication',
      },
    };
    const discount = toLookDiscount(raw as never);
    expect(discount.permyriad).toBe(1250);
    expect(discount.amount).toEqual({});
    expect(
      toLookDiscount({ ...raw, value: { type: 'absoluteCart', money: [] } })
        .permyriad
    ).toBeUndefined();
  });
});

describe('validateLook with percentages', () => {
  const look = {
    label: { en: 'x' },
    componentProductIds: ['a', 'b'],
    setPrice: { 'EUR/DE': 12750, 'EUR/FR': 12000 },
    sum: liveSum,
  };
  const codes = (more: object) =>
    validateLook(
      { ...look, ...more },
      new Map([...pieces].map(([k, p]) => [k, p.prices])),
      ['EUR/DE', 'EUR/FR']
    ).map((e) => [e.code, e.currency]);

  it('accepts percentage cells', () => {
    expect(codes({ savingPercent: { 'EUR/DE': 15 } })).toEqual([]);
  });

  it('rejects percentages outside 0 to 100 or with more than one decimal', () => {
    for (const percent of [0, 100, -5, 12.55]) {
      expect(codes({ savingPercent: { 'EUR/DE': percent } })).toEqual([
        ['saving-percent-invalid', 'EUR/DE'],
      ]);
    }
  });

  it('rejects mixed modes and different percentages within one country', () => {
    const cells = ['EUR/DE', 'CHF/DE'];
    const mixed = validateLook(
      {
        ...look,
        setPrice: { 'EUR/DE': 12750, 'CHF/DE': 12000 },
        savingPercent: { 'EUR/DE': 15 },
        sum: { 'EUR/DE': 15000, 'CHF/DE': 15000 },
      },
      new Map([
        ['a', { 'EUR/DE': 10000, 'CHF/DE': 10000 }],
        ['b', { 'EUR/DE': 5000, 'CHF/DE': 5000 }],
      ]),
      cells
    );
    expect(mixed.map((e) => [e.code, e.currency])).toEqual([
      ['discount-mode-mixed', 'CHF/DE'],
    ]);
  });
});

describe('look rows with relative discounts', () => {
  it('derives the price of a percentage cell live and has no drift', () => {
    const { row } = setup({
      percents: { 'EUR/DE': 15 },
      dePermyriad: 1500,
      setPrice: { 'EUR/DE': 99, 'EUR/FR': 12000 },
    });
    expect(row.cellPercents).toEqual({ 'EUR/DE': 15 });
    expect(row.setPrice).toEqual({ 'EUR/DE': 12750, 'EUR/FR': 12000 });
    expect(row.priceDrift).toBe(false);
  });

  it('drifts only when the permyriad differs', () => {
    expect(
      setup({ percents: { 'EUR/DE': 15 }, dePermyriad: 1000 }).row.priceDrift
    ).toBe(true);
  });

  it('drifts when an absolute cell has a relative discount', () => {
    expect(setup({ dePermyriad: 1500 }).row.priceDrift).toBe(true);
  });
});

describe('changeSetPrice between absolute and relative', () => {
  it('switches an absolute discount to relative, then writes the percentage', async () => {
    const { fake, row } = setup();
    const result = await changeSetPrice(
      fake.api,
      row,
      { 'EUR/DE': 12750, 'EUR/FR': 12000 },
      liveSum,
      { savingPercent: { 'EUR/DE': 15 } }
    );
    expect(result.unchanged).toBe(false);
    expect(fake.discounts.get('disc-x')).toMatchObject({
      amount: {},
      permyriad: 1500,
    });
    expect(fake.callsTo('updateCartDiscount')).toHaveLength(1);
    expect(fake.objects.get('look-x')!.value.savingPercent).toEqual({
      'EUR/DE': 15,
    });
  });

  it('switches a relative discount to absolute and drops the percentage', async () => {
    const { fake, row } = setup({
      percents: { 'EUR/DE': 15 },
      dePermyriad: 1500,
    });
    await changeSetPrice(
      fake.api,
      row,
      { 'EUR/DE': 13000, 'EUR/FR': 12000 },
      liveSum
    );
    const de = fake.discounts.get('disc-x')!;
    expect(de.amount).toEqual({ EUR: 2000 });
    expect(de.permyriad).toBeUndefined();
    expect(fake.objects.get('look-x')!.value.savingPercent).toBeUndefined();
  });

  it('changes only the permyriad when the percentage changes', async () => {
    const { fake, row } = setup({
      percents: { 'EUR/DE': 15 },
      dePermyriad: 1500,
    });
    await changeSetPrice(
      fake.api,
      row,
      { 'EUR/DE': 13500, 'EUR/FR': 12000 },
      liveSum,
      { savingPercent: { 'EUR/DE': 10 } }
    );
    expect(fake.discounts.get('disc-x')!.permyriad).toBe(1000);
    expect(fake.callsTo('updateCartDiscount')).toHaveLength(1);
  });

  it('makes no call when the percentage is unchanged, even if the sum moved', async () => {
    const { fake, row } = setup({
      percents: { 'EUR/DE': 15 },
      dePermyriad: 1500,
      setPrice: { 'EUR/DE': 12000, 'EUR/FR': 12000 },
    });
    const result = await changeSetPrice(
      fake.api,
      row,
      { 'EUR/DE': 12750, 'EUR/FR': 12000 },
      liveSum,
      { savingPercent: { 'EUR/DE': 15 } }
    );
    expect(result.unchanged).toBe(true);
    expect(fake.callsTo('writeLookObject')).toHaveLength(0);
  });

  it('creates a missing country discount with the relative value', async () => {
    const { fake, row } = setup();
    fake.discounts.delete('disc-x-fr');
    const result = await changeSetPrice(
      fake.api,
      { ...row, countryDiscounts: [] },
      { 'EUR/DE': 12750, 'EUR/FR': 12750 },
      liveSum,
      { savingPercent: { 'EUR/DE': 15, 'EUR/FR': 15 } }
    );
    expect(result.discounts.map((d) => d.permyriad)).toEqual([1500, 1500]);
    expect(fake.callsTo('createCartDiscount')[0].args[0]).toMatchObject({
      value: { relativeCart: { permyriad: 1500 } },
    });
  });
});

describe('completeLook with a relative discount', () => {
  it('rebuilds the object with the percentage and the price from the live sum', async () => {
    const { fake } = setup({ dePermyriad: 1250 });
    fake.objects.clear();
    const [row] = buildLookRows({
      objects: [],
      discounts: [...fake.discounts.values()],
      pieces,
      currencies: ['EUR'],
    });
    await completeLook(fake.api, row, { liveSum });
    expect(fake.objects.get('look-x')!.value).toEqual({
      componentProductIds: ['a', 'b'],
      setPrice: { 'EUR/DE': 13125, 'EUR/FR': 12000 },
      savingPercent: { 'EUR/DE': 12.5 },
    });
  });
});
