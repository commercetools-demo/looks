import { LookApiError } from './errors';
import { createFakeLookApi } from '../test-utils/fake-look-api';
import {
  buildDiscount,
  buildObject,
  buildPiece,
  CURRENCIES,
} from '../test-utils/fixtures';
import { buildLookRows } from './look-rows';
import type { LookDiscountGroup } from './types';
import {
  changePhoto,
  changeSetPrice,
  completeLook,
  recordLookEnd,
  SetPriceStepError,
  switchLook,
} from './look-writes';

const pieces = new Map([
  ['a', buildPiece('a', { prices: { EUR: 10000, CHF: 11000 } })],
  ['b', buildPiece('b', { prices: { EUR: 20000, CHF: 22000 } })],
]);
const liveSum = { EUR: 30000, CHF: 33000 };

const buildGroup = (
  lookKey: string,
  overrides: Partial<LookDiscountGroup> = {}
): LookDiscountGroup => ({
  id: `grp-${lookKey}`,
  version: 1,
  key: `look-${lookKey}`,
  sortOrder: '0.7',
  isActive: true,
  ...overrides,
});

const setup = (
  opts: {
    active?: boolean;
    object?: boolean;
    discount?: boolean;
    /** The look's Discount Group, none for a look from before groups. */
    group?: boolean;
  } = {}
) => {
  const object = buildObject('x', ['a', 'b'], {
    setPrice: { EUR: 28000, CHF: 30800 },
  });
  const discount = buildDiscount('x', ['a', 'b'], {
    isActive: opts.active ?? true,
    amount: { EUR: 2000, CHF: 2200 },
  });
  const fake = createFakeLookApi({
    objects: opts.object === false ? [] : [object],
    discounts: opts.discount === false ? [] : [discount],
    groups: opts.group
      ? [buildGroup('x', { isActive: opts.active ?? true })]
      : [],
  });
  const [row] = buildLookRows({
    objects: opts.object === false ? [] : [object],
    discounts: opts.discount === false ? [] : [discount],
    pieces,
    currencies: CURRENCIES,
  });
  return { fake, row };
};

describe('switchLook', () => {
  it('switches off with the current version, records the end date and keeps the object', async () => {
    const { fake, row } = setup();
    const result = await switchLook(fake.api, row.discount!, false, {
      objectKey: row.objectKey,
      now: new Date('2026-10-06T10:00:00.000Z'),
    });
    expect(result.outcome).toBe('updated');
    expect(fake.callsTo('updateCartDiscount')[0].args).toEqual([
      'disc-x',
      1,
      [{ changeIsActive: { isActive: false } }],
      'switchDiscount',
    ]);
    expect(fake.discounts.get('disc-x')!.isActive).toBe(false);
    expect(fake.objects.get('look-x')!.value.endedAt).toBe(
      '2026-10-06T10:00:00.000Z'
    );
    expect(fake.objects.get('look-x')!.value.componentProductIds).toEqual([
      'a',
      'b',
    ]);
  });

  it('switches the look group before the discounts, off and on', async () => {
    const off = setup({ group: true });
    await switchLook(off.fake.api, off.row.discount!, false, {
      objectKey: off.row.objectKey,
    });
    expect(
      off.fake.calls.map((c) => c.method).filter((m) => m.startsWith('update'))
    ).toEqual(['updateDiscountGroup', 'updateCartDiscount']);
    expect(off.fake.callsTo('getDiscountGroupByKey')[0].args).toEqual([
      'look-x',
    ]);
    expect(off.fake.callsTo('updateDiscountGroup')[0].args).toEqual([
      'grp-x',
      1,
      [{ setIsActive: { isActive: false } }],
      'switchDiscountGroup',
    ]);
    expect(off.fake.groups.get('grp-x')!.isActive).toBe(false);

    const on = setup({ group: true, active: false });
    await switchLook(on.fake.api, on.row.discount!, true, {
      objectKey: on.row.objectKey,
    });
    expect(
      on.fake.calls.map((c) => c.method).filter((m) => m.startsWith('update'))
    ).toEqual(['updateDiscountGroup', 'updateCartDiscount']);
    expect(on.fake.groups.get('grp-x')!.isActive).toBe(true);
  });

  it('skips the group of a look that has none', async () => {
    const { fake, row } = setup();
    const result = await switchLook(fake.api, row.discount!, false, {
      objectKey: row.objectKey,
    });
    expect(result.outcome).toBe('updated');
    expect(fake.callsTo('getDiscountGroupByKey')).toHaveLength(1);
    expect(fake.callsTo('updateDiscountGroup')).toHaveLength(0);
    expect(fake.callsTo('createDiscountGroup')).toHaveLength(0);
    expect(fake.discounts.get('disc-x')!.isActive).toBe(false);
  });

  it('does not touch a group that already has the state', async () => {
    const { fake, row } = setup({ group: true });
    fake.groups.set('grp-x', { ...fake.groups.get('grp-x')!, isActive: false });
    await switchLook(fake.api, row.discount!, false, {
      objectKey: row.objectKey,
    });
    expect(fake.callsTo('updateDiscountGroup')).toHaveLength(0);
  });

  it('does not read the group without an object key', async () => {
    const { fake, row } = setup({ group: true });
    await switchLook(fake.api, row.discount!, false);
    expect(fake.callsTo('getDiscountGroupByKey')).toHaveLength(0);
  });

  it('clears the end date when switched on again', async () => {
    const { fake, row } = setup({ active: false });
    fake.objects.set('look-x', {
      ...fake.objects.get('look-x')!,
      value: {
        ...fake.objects.get('look-x')!.value,
        endedAt: '2026-10-06T10:00:00.000Z',
      },
    });
    await switchLook(fake.api, row.discount!, true, {
      objectKey: row.objectKey,
    });
    expect(fake.objects.get('look-x')!.value.endedAt).toBeUndefined();
  });

  it('on a version conflict re-reads the discount, writes nothing to the object, and does not retry', async () => {
    const { fake, row } = setup();
    await fake.api.updateCartDiscount(
      'disc-x',
      1,
      [{ changeIsActive: { isActive: false } }],
      'switchDiscount'
    ); // someone else
    const writesBefore = fake.callsTo('writeLookObject').length;
    const result = await switchLook(fake.api, row.discount!, true, {
      objectKey: row.objectKey,
    });
    expect(result.outcome).toBe('conflict');
    expect(result.discount.isActive).toBe(false);
    expect(result.discount.version).toBe(2);
    expect(fake.callsTo('updateCartDiscount')).toHaveLength(2);
    expect(fake.callsTo('writeLookObject')).toHaveLength(writesBefore);
  });

  it('still succeeds when the end-date write fails', async () => {
    const { fake, row } = setup();
    fake.failNext(
      'writeLookObject',
      new LookApiError('writeLookObject', 'network', undefined)
    );
    const result = await switchLook(fake.api, row.discount!, false, {
      objectKey: row.objectKey,
    });
    expect(result.outcome).toBe('updated');
    expect(fake.discounts.get('disc-x')!.isActive).toBe(false);
    expect(fake.objects.get('look-x')!.value.endedAt).toBeUndefined();
  });

  it('rethrows other errors', async () => {
    const { fake, row } = setup();
    fake.failNext(
      'updateCartDiscount',
      new LookApiError('switchDiscount', 'forbidden', undefined)
    );
    await expect(
      switchLook(fake.api, row.discount!, false)
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });
});

describe('recordLookEnd', () => {
  it('writes nothing when the value already says so or the object is missing', async () => {
    const { fake } = setup();
    expect(await recordLookEnd(fake.api, 'look-x', undefined)).toBeDefined();
    expect(fake.callsTo('writeLookObject')).toHaveLength(0);
    expect(await recordLookEnd(fake.api, 'look-nope', 'x')).toBeUndefined();
  });
});

describe('changeSetPrice', () => {
  it("changes the discount amount from today's live sum, then the object, with versions", async () => {
    const { fake, row } = setup();
    const result = await changeSetPrice(
      fake.api,
      row,
      { EUR: 27000, CHF: 29700 },
      liveSum
    );
    expect(result.unchanged).toBe(false);
    expect(fake.discounts.get('disc-x')!.amount).toEqual({
      EUR: 3000,
      CHF: 3300,
    });
    expect(fake.objects.get('look-x')!.value.setPrice).toEqual({
      EUR: 27000,
      CHF: 29700,
    });
    expect(fake.callsTo('updateCartDiscount')[0].args[1]).toBe(1);
  });

  it('makes no call when nothing changes', async () => {
    const { fake, row } = setup();
    const result = await changeSetPrice(
      fake.api,
      row,
      { EUR: 28000, CHF: 30800 },
      liveSum
    );
    expect(result.unchanged).toBe(true);
    expect(fake.callsTo('updateCartDiscount')).toHaveLength(0);
    expect(fake.callsTo('writeLookObject')).toHaveLength(0);
  });

  it('recomputes the amount for an unchanged set price after prices drifted', async () => {
    const { fake, row } = setup();
    const result = await changeSetPrice(
      fake.api,
      row,
      { EUR: 28000, CHF: 30800 },
      { EUR: 31000, CHF: 33000 }
    );
    expect(result.unchanged).toBe(false);
    expect(fake.discounts.get('disc-x')!.amount).toEqual({
      EUR: 3000,
      CHF: 2200,
    });
  });

  it('reports a failed object write after a successful discount write and lets retry write only the object', async () => {
    const { fake, row } = setup();
    fake.failNext(
      'writeLookObject',
      new LookApiError('writeLookObject', 'network', undefined)
    );
    const error = await changeSetPrice(
      fake.api,
      row,
      { EUR: 27000, CHF: 29700 },
      liveSum
    ).catch((e) => e);
    expect(error).toBeInstanceOf(SetPriceStepError);
    expect(error).toMatchObject({ step: 'object', discountChanged: true });
    expect(fake.discounts.get('disc-x')!.amount).toEqual({
      EUR: 3000,
      CHF: 3300,
    });

    const updatesBefore = fake.callsTo('updateCartDiscount').length;
    await changeSetPrice(fake.api, row, { EUR: 27000, CHF: 29700 }, liveSum, {
      discountChanged: true,
    });
    expect(fake.callsTo('updateCartDiscount')).toHaveLength(updatesBefore);
    expect(fake.objects.get('look-x')!.value.setPrice).toEqual({
      EUR: 27000,
      CHF: 29700,
    });
  });

  it('detects a lost response (discount applied although the call failed)', async () => {
    const { fake, row } = setup();
    const original = fake.api.updateCartDiscount;
    fake.api.updateCartDiscount = async (...args) => {
      await original(...args);
      throw new LookApiError('changeDiscountValue', 'network', undefined);
    };
    const error = await changeSetPrice(
      fake.api,
      row,
      { EUR: 27000, CHF: 29700 },
      liveSum
    ).catch((e) => e);
    expect(error).toMatchObject({ step: 'discount', discountChanged: true });
  });

  it('needs a complete look', async () => {
    const { fake, row } = setup({ object: false });
    await expect(
      changeSetPrice(fake.api, row, { EUR: 1, CHF: 1 }, liveSum)
    ).rejects.toThrow('complete look');
  });
});

describe('changePhoto', () => {
  const image = { path: 'looks/x.webp', width: 10, height: 15 };

  it('sets, keeps no call when unchanged, and clears the photo; endedAt survives', async () => {
    const { fake } = setup();
    fake.objects.set('look-x', {
      ...fake.objects.get('look-x')!,
      value: {
        ...fake.objects.get('look-x')!.value,
        endedAt: '2026-10-06T10:00:00.000Z',
      },
    });
    expect((await changePhoto(fake.api, 'look-x', image)).unchanged).toBe(
      false
    );
    expect(fake.objects.get('look-x')!.value).toMatchObject({
      image,
      endedAt: '2026-10-06T10:00:00.000Z',
    });
    const writes = fake.callsTo('writeLookObject').length;
    expect((await changePhoto(fake.api, 'look-x', image)).unchanged).toBe(true);
    expect(fake.callsTo('writeLookObject')).toHaveLength(writes);
    await changePhoto(fake.api, 'look-x', undefined);
    expect(fake.objects.get('look-x')!.value.image).toBeUndefined();
    expect(fake.objects.get('look-x')!.value.endedAt).toBe(
      '2026-10-06T10:00:00.000Z'
    );
  });
});

describe('completeLook', () => {
  it('rebuilds a missing object from the discount, keeping the discount state', async () => {
    const { fake, row } = setup({ object: false, active: false });
    await completeLook(fake.api, row, { liveSum });
    expect(fake.objects.get('look-x')!.value).toEqual({
      componentProductIds: ['a', 'b'],
      setPrice: { EUR: 28000, CHF: 30800 },
    });
    expect(fake.discounts.get('disc-x')!.isActive).toBe(false);
    expect(fake.callsTo('updateCartDiscount')).toHaveLength(0);
  });

  it('creates a missing discount inactive from the object under the given name, with a free rank', async () => {
    const { fake, row } = setup({ discount: false });
    fake.discounts.set(
      'other',
      buildDiscount('other', ['a'], { id: 'other', sortOrder: '0.7' })
    );
    await completeLook(fake.api, row, {
      liveSum,
      label: { de: 'Mein Look', en: 'My look' },
    });
    const created = [...fake.discounts.values()].find(
      (d) => d.key === 'look-x'
    )!;
    expect(created.isActive).toBe(false);
    // the discount takes the rank of its new group
    expect(created.sortOrder).toBe('0.7001');
    const group = [...fake.groups.values()][0];
    expect(group).toMatchObject({
      key: 'look-x',
      sortOrder: '0.7001',
      isActive: false,
    });
    expect(fake.callsTo('createDiscountGroup')[0].args[0]).toMatchObject({
      name: [
        { locale: 'de', value: 'Look-Set: Mein Look' },
        { locale: 'en', value: 'Look set: My look' },
      ],
    });
    expect(
      fake.calls.map((c) => c.method).filter((m) => m.startsWith('create'))
    ).toEqual(['createDiscountGroup', 'createCartDiscount']);
    expect(created.name.de).toBe('Look-Set: Mein Look');
    expect(created.amount).toEqual({ EUR: 2000, CHF: 2200 });
  });

  it('puts the created discount in the existing group instead of making a second one', async () => {
    const { fake, row } = setup({ discount: false, group: true });
    await completeLook(fake.api, row, {
      liveSum,
      label: { de: 'Mein Look', en: 'My look' },
    });
    expect(fake.callsTo('createDiscountGroup')).toHaveLength(0);
    expect(fake.groups.size).toBe(1);
    const created = [...fake.discounts.values()][0];
    expect(created.sortOrder).toBe('0.7');
    expect(created.isActive).toBe(false);
    expect(fake.groups.get('grp-x')!.isActive).toBe(true);
  });

  it('refuses a missing discount without a name and a complete look', async () => {
    const { fake, row } = setup({ discount: false });
    await expect(completeLook(fake.api, row, { liveSum })).rejects.toThrow();
    const complete = setup();
    await expect(
      completeLook(complete.fake.api, complete.row, { liveSum })
    ).rejects.toThrow();
  });
});

describe('looks with country discounts', () => {
  const cellPieces = new Map([
    ['a', buildPiece('a', { prices: { 'EUR/DE': 3299, 'EUR/FR': 2639 } })],
    ['b', buildPiece('b', { prices: { 'EUR/DE': 1000, 'EUR/FR': 1000 } })],
  ]);
  const cellSum = { 'EUR/DE': 4299, 'EUR/FR': 3639 };
  const price = { 'EUR/DE': 4000, 'EUR/FR': 3000 };

  const multi = (withFr = true, active = true) => {
    const object = buildObject('x', ['a', 'b'], { setPrice: price });
    const main = buildDiscount('x', ['a', 'b'], {
      country: 'DE',
      isActive: active,
      amount: { EUR: 299 },
    });
    const fr = buildDiscount('x', ['a', 'b'], {
      id: 'disc-x-fr',
      key: 'look-x-FR',
      country: 'FR',
      isActive: active,
      amount: { EUR: 639 },
      sortOrder: '0.7001',
    });
    const discounts = withFr ? [main, fr] : [main];
    const fake = createFakeLookApi({ objects: [object], discounts });
    const [row] = buildLookRows({
      objects: [object],
      discounts,
      pieces: cellPieces,
      currencies: ['EUR'],
    });
    return { fake, row };
  };

  const order = (fake: ReturnType<typeof createFakeLookApi>) =>
    fake.callsTo('updateCartDiscount').map((c) => c.args[0]);

  it('switches on: country discounts first, the main discount last', async () => {
    const { fake, row } = multi(true, false);
    const result = await switchLook(fake.api, row.discount!, true, {
      countryDiscounts: row.countryDiscounts,
    });
    expect(result.outcome).toBe('updated');
    expect(order(fake)).toEqual(['disc-x-fr', 'disc-x']);
    expect(fake.discounts.get('disc-x-fr')!.isActive).toBe(true);
    expect(fake.discounts.get('disc-x')!.isActive).toBe(true);
  });

  it('switches off: the main discount first, then the country discounts', async () => {
    const { fake, row } = multi();
    await switchLook(fake.api, row.discount!, false, {
      objectKey: row.objectKey,
      now: new Date('2026-10-06T10:00:00.000Z'),
      countryDiscounts: row.countryDiscounts,
    });
    expect(order(fake)).toEqual(['disc-x', 'disc-x-fr']);
    expect(fake.discounts.get('disc-x-fr')!.isActive).toBe(false);
    expect(fake.objects.get('look-x')!.value.endedAt).toBe(
      '2026-10-06T10:00:00.000Z'
    );
  });

  it('on a conflict on the main discount leaves the country discounts alone when switching off', async () => {
    const { fake, row } = multi();
    await fake.api.updateCartDiscount(
      'disc-x',
      1,
      [{ changeIsActive: { isActive: true } }],
      'switchDiscount'
    );
    const result = await switchLook(fake.api, row.discount!, false, {
      countryDiscounts: row.countryDiscounts,
    });
    expect(result.outcome).toBe('conflict');
    expect(fake.discounts.get('disc-x-fr')!.isActive).toBe(true);
  });

  it('retries a conflicting country discount with its current version', async () => {
    const { fake, row } = multi(true, false);
    await fake.api.updateCartDiscount(
      'disc-x-fr',
      1,
      [
        {
          changeValue: {
            value: {
              absoluteCart: {
                money: [{ currencyCode: 'EUR', centAmount: 639 }],
                applicationMode: 'ProportionateDistribution',
              },
            },
          },
        },
      ],
      'changeDiscountValue'
    );
    const result = await switchLook(fake.api, row.discount!, true, {
      countryDiscounts: row.countryDiscounts,
    });
    expect(result.outcome).toBe('updated');
    expect(fake.discounts.get('disc-x-fr')!.isActive).toBe(true);
  });

  it('changes only the country discounts whose amount changed', async () => {
    const { fake, row } = multi();
    const result = await changeSetPrice(
      fake.api,
      row,
      { 'EUR/DE': 4000, 'EUR/FR': 2900 },
      cellSum
    );
    expect(result.unchanged).toBe(false);
    expect(order(fake)).toEqual(['disc-x-fr']);
    expect(fake.discounts.get('disc-x-fr')!.amount).toEqual({ EUR: 739 });
    expect(fake.discounts.get('disc-x')!.amount).toEqual({ EUR: 299 });
    expect(fake.objects.get('look-x')!.value.setPrice).toEqual({
      'EUR/DE': 4000,
      'EUR/FR': 2900,
    });
  });

  it('makes no call when every country already matches', async () => {
    const { fake, row } = multi();
    const result = await changeSetPrice(fake.api, row, price, cellSum);
    expect(result.unchanged).toBe(true);
    expect(fake.calls.filter((c) => c.method !== 'fetchLookObjects')).toEqual(
      []
    );
  });

  it('creates a missing country discount with the look status and a free rank', async () => {
    const { fake, row } = multi(false);
    const result = await changeSetPrice(fake.api, row, price, cellSum);
    expect(result.unchanged).toBe(false);
    const created = [...fake.discounts.values()].find(
      (d) => d.key === 'look-x-FR'
    )!;
    // the discount takes the rank of the (new) group
    expect(created).toMatchObject({
      country: 'FR',
      isActive: true,
      sortOrder: '0.7001',
      amount: { EUR: 639 },
      pieceIds: ['a', 'b'],
    });
    expect(
      (
        fake.callsTo('createCartDiscount')[0].args[0] as {
          cartPredicate: string;
        }
      ).cartPredicate
    ).toBe('country = "FR"');
    expect(fake.objects.get('look-x')!.value.setPrice).toEqual(price);
  });

  it('creates the group of a look from before groups, with the look status, and puts the discount in it', async () => {
    const { fake, row } = multi(false);
    await changeSetPrice(fake.api, row, price, cellSum);
    expect(fake.callsTo('createDiscountGroup')).toHaveLength(1);
    expect(fake.callsTo('createDiscountGroup')[0].args[0]).toMatchObject({
      key: 'look-x',
      sortOrder: '0.7001',
      isActive: true,
    });
    const draft = fake.callsTo('createCartDiscount')[0].args[0] as {
      discountGroup: unknown;
    };
    expect(draft.discountGroup).toEqual({
      typeId: 'discount-group',
      key: 'look-x',
    });
    expect('sortOrder' in draft).toBe(false);
  });

  it('creates that group inactive for an inactive look', async () => {
    const { fake, row } = multi(false, false);
    await changeSetPrice(fake.api, row, price, cellSum);
    expect(fake.callsTo('createDiscountGroup')[0].args[0]).toMatchObject({
      isActive: false,
    });
  });

  it('reuses the existing group for a missing country discount', async () => {
    const { fake, row } = multi(false);
    fake.groups.set('grp-x', buildGroup('x', { sortOrder: '0.7' }));
    await changeSetPrice(fake.api, row, price, cellSum);
    expect(fake.callsTo('createDiscountGroup')).toHaveLength(0);
    expect(fake.groups.size).toBe(1);
    expect(fake.callsTo('createCartDiscount')).toHaveLength(1);
  });

  it('creates an inactive country discount for an inactive look', async () => {
    const { fake, row } = multi(false, false);
    await changeSetPrice(fake.api, row, price, cellSum);
    expect(
      [...fake.discounts.values()].find((d) => d.key === 'look-x-FR')!.isActive
    ).toBe(false);
  });

  it('rebuilds a missing object from the main and country discounts per cell', async () => {
    const object = buildObject('x', ['a', 'b']);
    const { fake } = multi();
    fake.objects.delete(object.key);
    const [row] = buildLookRows({
      objects: [],
      discounts: [...fake.discounts.values()],
      pieces: cellPieces,
      currencies: ['EUR'],
    });
    await completeLook(fake.api, row, { liveSum: cellSum });
    expect(fake.objects.get('look-x')!.value).toEqual({
      componentProductIds: ['a', 'b'],
      setPrice: price,
    });
  });

  it('creates only the missing discounts of a look without its main one', async () => {
    const { fake } = multi();
    fake.discounts.delete('disc-x');
    const [row] = buildLookRows({
      objects: [...fake.objects.values()],
      discounts: [...fake.discounts.values()],
      pieces: cellPieces,
      currencies: ['EUR'],
    });
    expect(row.completeness).toBe('missing-discount');
    await completeLook(fake.api, row, {
      liveSum: cellSum,
      label: { de: 'Mein Look', en: 'My look' },
    });
    expect(fake.callsTo('createCartDiscount')).toHaveLength(1);
    expect([...fake.discounts.values()].map((d) => d.key).sort()).toEqual([
      'look-x',
      'look-x-FR',
    ]);
    expect(fake.groups.size).toBe(1);
  });
});
