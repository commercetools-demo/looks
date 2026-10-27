import { LookApiError } from './errors';
import { createFakeLookApi } from '../test-utils/fake-look-api';
import {
  buildDiscount,
  buildObject,
  buildPiece,
  CURRENCIES,
} from '../test-utils/fixtures';
import { buildLookRows } from './look-rows';
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

const setup = (
  opts: { active?: boolean; object?: boolean; discount?: boolean } = {}
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
    expect(created.sortOrder).toBe('0.701');
    expect(created.name.de).toBe('Look-Set: Mein Look');
    expect(created.amount).toEqual({ EUR: 2000, CHF: 2200 });
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
