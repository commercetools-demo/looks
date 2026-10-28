/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { LookApiError } from './errors';
import { createFakeLookApi } from '../test-utils/fake-look-api';
import { buildDiscount, buildObject } from '../test-utils/fixtures';
import {
  LookKeyTakenError,
  planMatches,
  planNewLook,
  runSave,
  saveNewLook,
  SaveStepError,
  NO_PROGRESS,
} from './save-look';
import type { NewLook } from './types';

const input: NewLook = {
  label: { de: 'Kontrast-Look', en: 'Contrast look' },
  componentProductIds: ['a', 'b'],
  setPrice: { EUR: 27000, CHF: 29700 },
  sum: { EUR: 30000, CHF: 33000 },
};

/** Two countries: EUR in DE and FR (one discount each). */
const multi: NewLook = {
  label: { de: 'Kontrast-Look', en: 'Contrast look' },
  componentProductIds: ['a', 'b'],
  setPrice: { 'EUR/DE': 27000, 'EUR/FR': 21000 },
  sum: { 'EUR/DE': 30000, 'EUR/FR': 23000 },
};

describe('planNewLook', () => {
  it('derives the key from the English name and the lowest free rank', async () => {
    const fake = createFakeLookApi({
      objects: [buildObject('contrast-look', ['a', 'b'])],
      discounts: [
        buildDiscount('contrast-look', ['a', 'b'], { sortOrder: '0.7' }),
        buildDiscount('other', ['c'], { sortOrder: '0.81' }),
      ],
    });
    const plan = await planNewLook(fake.api, input);
    expect(plan.look.key).toBe('contrast-look-2');
    expect(plan.sortOrder).toBe('0.7001');
  });

  it('plans ONE rank for the look group, whatever the number of countries', async () => {
    const fake = createFakeLookApi({
      discounts: [buildDiscount('other', ['c'], { sortOrder: '0.7' })],
    });
    const plan = await planNewLook(fake.api, multi);
    expect(plan.sortOrder).toBe('0.7001');
  });

  it('picks a rank free among the discounts AND the discount groups', async () => {
    const fake = createFakeLookApi({
      discounts: [buildDiscount('a', ['c'], { sortOrder: '0.7' })],
      groups: [
        {
          id: 'g0',
          version: 1,
          key: 'look-b',
          sortOrder: '0.7001',
          isActive: true,
        },
      ],
    });
    const plan = await planNewLook(fake.api, input);
    expect(plan.sortOrder).toBe('0.7002');
    expect(fake.callsTo('fetchDiscountGroups')).toHaveLength(1);
  });
});

describe('runSave', () => {
  const plan = {
    look: { key: 'contrast-look', ...input },
    sortOrder: '0.7',
  };

  it('writes group, discount, object, and activation in this order', async () => {
    const fake = createFakeLookApi();
    const progress = await runSave(fake.api, plan, NO_PROGRESS, {
      activate: true,
    });
    expect(
      fake.calls
        .map((c) => c.method)
        .filter((m) =>
          [
            'createDiscountGroup',
            'createCartDiscount',
            'writeLookObject',
            'updateDiscountGroup',
            'updateCartDiscount',
          ].includes(m)
        )
    ).toEqual([
      'createDiscountGroup',
      'createCartDiscount',
      'writeLookObject',
      'updateDiscountGroup',
      'updateCartDiscount',
    ]);
    expect(progress).toMatchObject({ objectWritten: true, activated: true });
    expect(fake.discounts.get('d2')!.isActive).toBe(true);
    expect(fake.groups.get('g1')!.isActive).toBe(true);
    expect(
      fake.objects.get('look-contrast-look')!.value.componentProductIds
    ).toEqual(['a', 'b']);
  });

  it('creates the discount inactive and leaves it inactive without activation', async () => {
    const fake = createFakeLookApi();
    const progress = await runSave(fake.api, plan);
    expect(progress.activated).toBe(false);
    expect([...fake.discounts.values()][0].isActive).toBe(false);
    expect(fake.callsTo('updateCartDiscount')).toHaveLength(0);
    expect(fake.callsTo('updateDiscountGroup')).toHaveLength(0);
  });

  it('creates the group inactive and first, with the rank of the plan', async () => {
    const fake = createFakeLookApi();
    const progress = await runSave(fake.api, plan);
    expect(fake.calls[0].method).toBe('getDiscountGroupByKey');
    expect(fake.calls[1]).toMatchObject({
      method: 'createDiscountGroup',
      args: [
        {
          key: 'look-contrast-look',
          sortOrder: '0.7',
          isActive: false,
          name: [
            { locale: 'de', value: 'Kontrast-Look' },
            { locale: 'en', value: 'Contrast look' },
          ],
        },
      ],
    });
    expect(fake.calls[1].args[0]).not.toHaveProperty('description');
    expect([...fake.groups.values()]).toHaveLength(1);
    expect(fake.groups.get('g1')!.isActive).toBe(false);
    expect(progress.group).toEqual({ id: 'g1', version: 1 });
  });

  it('puts the discounts in the group (no own rank)', async () => {
    const fake = createFakeLookApi();
    await runSave(fake.api, plan);
    const draft = fake.callsTo('createCartDiscount')[0].args[0] as {
      discountGroup: unknown;
    };
    expect(draft.discountGroup).toEqual({
      typeId: 'discount-group',
      key: 'look-contrast-look',
    });
    expect('sortOrder' in draft).toBe(false);
  });

  it('reuses an existing group of the key instead of creating a second one', async () => {
    const fake = createFakeLookApi({
      groups: [
        {
          id: 'g-old',
          version: 3,
          key: 'look-contrast-look',
          sortOrder: '0.7',
          isActive: false,
        },
      ],
    });
    const progress = await runSave(fake.api, plan);
    expect(fake.callsTo('createDiscountGroup')).toHaveLength(0);
    expect(fake.groups.size).toBe(1);
    expect(progress.group).toEqual({ id: 'g-old', version: 3 });
  });

  it('activates the group first and the main discount last', async () => {
    const fake = createFakeLookApi();
    await runSave(fake.api, plan, NO_PROGRESS, { activate: true });
    const switches = fake.calls.filter((c) =>
      ['updateDiscountGroup', 'updateCartDiscount'].includes(c.method)
    );
    expect(switches.map((c) => c.method)).toEqual([
      'updateDiscountGroup',
      'updateCartDiscount',
    ]);
    expect(fake.callsTo('updateDiscountGroup')[0].args).toEqual([
      'g1',
      1,
      [{ setIsActive: { isActive: true } }],
      'switchDiscountGroup',
    ]);
  });

  it('resumes after a failed group create without a duplicate', async () => {
    const fake = createFakeLookApi();
    fake.failNext(
      'createDiscountGroup',
      new LookApiError('createDiscountGroup', 'network', undefined)
    );
    const failure = await runSave(fake.api, plan).catch((e) => e);
    expect(failure).toBeInstanceOf(SaveStepError);
    expect(failure.step).toBe('discount');
    expect(failure.progress.group).toBeUndefined();
    expect(fake.discounts.size).toBe(0);
    await runSave(fake.api, plan, failure.progress);
    expect(fake.groups.size).toBe(1);
    expect(fake.discounts.size).toBe(1);
  });

  it('reports a group key taken by a concurrent save as a taken key', async () => {
    const fake = createFakeLookApi();
    fake.failNext(
      'createDiscountGroup',
      new LookApiError('createDiscountGroup', 'duplicate', undefined)
    );
    await expect(runSave(fake.api, plan)).rejects.toBeInstanceOf(
      LookKeyTakenError
    );
  });

  it('writes the discount draft the shop needs', async () => {
    const fake = createFakeLookApi();
    await runSave(fake.api, plan);
    const [discount] = [...fake.discounts.values()];
    expect(discount.key).toBe('look-contrast-look');
    expect(discount.amount).toEqual({ EUR: 3000, CHF: 3300 });
    expect(discount.sortOrder).toBe('0.7');
    expect(discount.pieceIds).toEqual(['a', 'b']);
    expect(discount.name).toEqual({
      de: 'Look-Set: Kontrast-Look',
      en: 'Look set: Contrast look',
    });
  });

  it('puts the description of the look into the group and leaves the discounts unchanged', async () => {
    const fake = createFakeLookApi();
    await runSave(fake.api, {
      ...plan,
      look: { ...plan.look, description: { de: 'Gemütlich', en: 'Cosy' } },
    });
    expect(fake.callsTo('createDiscountGroup')[0].args[0]).toMatchObject({
      name: [
        { locale: 'de', value: 'Kontrast-Look' },
        { locale: 'en', value: 'Contrast look' },
      ],
      description: [
        { locale: 'de', value: 'Gemütlich' },
        { locale: 'en', value: 'Cosy' },
      ],
    });
    const [discount] = [...fake.discounts.values()];
    expect(discount.name).toEqual({
      de: 'Look-Set: Kontrast-Look',
      en: 'Look set: Contrast look',
    });
    expect(discount.description).toEqual({
      de: 'Kontrast-Look',
      en: 'Contrast look',
    });
  });

  it.each([
    ['createDiscountGroup', 'discount'],
    ['createCartDiscount', 'discount'],
    ['writeLookObject', 'object'],
    ['updateDiscountGroup', 'activation'],
    ['updateCartDiscount', 'activation'],
  ])(
    'resumes after a failure in %s with no duplicates',
    async (method, step) => {
      const fake = createFakeLookApi();
      fake.failNext(
        method,
        new LookApiError('createDiscount', 'network', undefined)
      );
      const failure = await runSave(fake.api, plan, NO_PROGRESS, {
        activate: true,
      }).catch((e) => e);
      expect(failure).toBeInstanceOf(SaveStepError);
      expect(failure.step).toBe(step);

      const progress = await runSave(fake.api, plan, failure.progress, {
        activate: true,
      });
      expect(progress).toMatchObject({ objectWritten: true, activated: true });
      expect(fake.discounts.size).toBe(1);
      expect(fake.groups.size).toBe(1);
      expect(fake.objects.size).toBe(1);
      expect([...fake.discounts.values()][0].isActive).toBe(true);
      expect([...fake.groups.values()][0].isActive).toBe(true);
    }
  );

  it('is idempotent: running again after success writes nothing new', async () => {
    const fake = createFakeLookApi();
    await runSave(fake.api, plan, NO_PROGRESS, { activate: true });
    const before = fake.calls.length;
    await runSave(fake.api, plan, NO_PROGRESS, { activate: true });
    expect(fake.discounts.size).toBe(1);
    expect(fake.objects.size).toBe(1);
    expect(fake.callsTo('createCartDiscount')).toHaveLength(1);
    expect(fake.callsTo('createDiscountGroup')).toHaveLength(1);
    expect(fake.callsTo('writeLookObject')).toHaveLength(1);
    expect(fake.calls.length).toBeGreaterThan(before);
  });

  it('reports a key held by a different look', async () => {
    const fake = createFakeLookApi({
      discounts: [buildDiscount('contrast-look', ['x', 'y'])],
    });
    await expect(runSave(fake.api, plan)).rejects.toMatchObject({
      name: 'LookKeyTakenError',
    });
  });

  it('re-reads the discount version when a resumed activation conflicts', async () => {
    const fake = createFakeLookApi();
    const failure = await (async () => {
      fake.failNext(
        'updateCartDiscount',
        new LookApiError('activateDiscount', 'network', undefined)
      );
      return runSave(fake.api, plan, NO_PROGRESS, { activate: true }).catch(
        (e) => e
      );
    })();
    // someone else touches the discount in between
    await fake.api.updateCartDiscount(
      'd2',
      1,
      [{ changeIsActive: { isActive: false } }],
      'switchDiscount'
    );
    const progress = await runSave(fake.api, plan, failure.progress, {
      activate: true,
    });
    expect(progress.activated).toBe(true);
    expect(fake.discounts.get('d2')!.isActive).toBe(true);
  });
});

describe('runSave with several countries', () => {
  const plan = {
    look: { key: 'contrast-look', ...multi },
    sortOrder: '0.7',
  };
  const writes = (fake: ReturnType<typeof createFakeLookApi>) =>
    fake.calls.filter((c) =>
      [
        'createDiscountGroup',
        'createCartDiscount',
        'writeLookObject',
        'updateDiscountGroup',
        'updateCartDiscount',
      ].includes(c.method)
    );

  it('creates one inactive discount per country, the main one first', async () => {
    const fake = createFakeLookApi();
    const progress = await runSave(fake.api, plan);
    const discounts = [...fake.discounts.values()];
    expect(discounts.map((d) => d.key)).toEqual([
      'look-contrast-look',
      'look-contrast-look-FR',
    ]);
    expect(discounts.map((d) => d.country)).toEqual(['DE', 'FR']);
    // a discount in a group has the group's rank
    expect(discounts.map((d) => d.sortOrder)).toEqual(['0.7', '0.7']);
    expect(discounts.map((d) => d.amount)).toEqual([
      { EUR: 3000 },
      { EUR: 2000 },
    ]);
    expect(discounts.every((d) => !d.isActive)).toBe(true);
    expect(
      fake
        .callsTo('createCartDiscount')
        .map((c) => (c.args[0] as { cartPredicate: string }).cartPredicate)
    ).toEqual(['country = "DE"', 'country = "FR"']);
    expect(progress.discount?.id).toBe('d2');
    expect(progress.countryDiscounts).toEqual({
      'look-contrast-look-FR': { id: 'd3', version: 1 },
    });
    expect(fake.groups.size).toBe(1);
    expect(
      fake
        .callsTo('createCartDiscount')
        .every(
          (c) =>
            (c.args[0] as { discountGroup: { key: string } }).discountGroup
              .key === 'look-contrast-look'
        )
    ).toBe(true);
    expect(progress.activated).toBe(false);
  });

  it('writes the group, discounts, then the object, then activates the group, the country discounts and the main one last', async () => {
    const fake = createFakeLookApi();
    const progress = await runSave(fake.api, plan, NO_PROGRESS, {
      activate: true,
    });
    expect(writes(fake).map((c) => c.method)).toEqual([
      'createDiscountGroup',
      'createCartDiscount',
      'createCartDiscount',
      'writeLookObject',
      'updateDiscountGroup',
      'updateCartDiscount',
      'updateCartDiscount',
    ]);
    // d3 is the FR country discount, d2 the main one
    expect(fake.callsTo('updateCartDiscount').map((c) => c.args[0])).toEqual([
      'd3',
      'd2',
    ]);
    expect(progress).toMatchObject({ objectWritten: true, activated: true });
    expect([...fake.discounts.values()].every((d) => d.isActive)).toBe(true);
  });

  it.each([
    ['the first discount', 1],
    ['a country discount', 2],
  ])(
    'resumes after a failure creating %s with no duplicates',
    async (_n, call) => {
      const fake = createFakeLookApi();
      for (let i = 1; i < call; i += 1) {
        // let earlier creates pass
      }
      const original = fake.api.createCartDiscount;
      let count = 0;
      fake.api.createCartDiscount = async (draft) => {
        count += 1;
        if (count === call) {
          throw new LookApiError('createDiscount', 'network', undefined);
        }
        return original(draft);
      };
      const failure = await runSave(fake.api, plan, NO_PROGRESS, {
        activate: true,
      }).catch((e) => e);
      expect(failure).toBeInstanceOf(SaveStepError);
      expect(failure.step).toBe('discount');
      expect(fake.objects.size).toBe(0);

      const progress = await runSave(fake.api, plan, failure.progress, {
        activate: true,
      });
      expect(progress).toMatchObject({ objectWritten: true, activated: true });
      expect(fake.discounts.size).toBe(2);
      expect([...fake.discounts.values()].every((d) => d.isActive)).toBe(true);
    }
  );

  it('resumes a failed activation of the main discount without touching finished ones twice', async () => {
    const fake = createFakeLookApi();
    const original = fake.api.updateCartDiscount;
    let count = 0;
    fake.api.updateCartDiscount = async (...args) => {
      count += 1;
      if (count === 2) {
        throw new LookApiError('activateDiscount', 'network', undefined);
      }
      return original(...args);
    };
    const failure = await runSave(fake.api, plan, NO_PROGRESS, {
      activate: true,
    }).catch((e) => e);
    expect(failure.step).toBe('activation');
    expect(fake.discounts.get('d3')!.isActive).toBe(true);
    expect(fake.discounts.get('d2')!.isActive).toBe(false);

    const progress = await runSave(fake.api, plan, failure.progress, {
      activate: true,
    });
    expect(progress.activated).toBe(true);
    expect(fake.discounts.get('d2')!.isActive).toBe(true);
    expect(fake.discounts.size).toBe(2);
    expect(fake.groups.size).toBe(1);
  });

  it('is idempotent: running again creates nothing new', async () => {
    const fake = createFakeLookApi();
    await runSave(fake.api, plan, NO_PROGRESS, { activate: true });
    await runSave(fake.api, plan, NO_PROGRESS, { activate: true });
    expect(fake.callsTo('createCartDiscount')).toHaveLength(2);
    expect(fake.callsTo('createDiscountGroup')).toHaveLength(1);
    expect(fake.callsTo('writeLookObject')).toHaveLength(1);
    expect(fake.discounts.size).toBe(2);
    expect(fake.groups.size).toBe(1);
  });

  it('reports a country discount key held by a different look', async () => {
    const fake = createFakeLookApi({
      discounts: [
        buildDiscount('contrast-look-FR', ['x', 'y'], {
          key: 'look-contrast-look-FR',
          sortOrder: '0.71',
        }),
      ],
    });
    await expect(runSave(fake.api, plan)).rejects.toMatchObject({
      name: 'LookKeyTakenError',
      key: 'look-contrast-look-FR',
    });
  });
});

describe('saveNewLook', () => {
  it('re-plans once when the key was taken meanwhile', async () => {
    const fake = createFakeLookApi();
    // the first plan sees no discount, then another user creates the same key before our create
    const original = fake.api.createCartDiscount;
    let raced = false;
    fake.api.createCartDiscount = async (draft) => {
      if (!raced) {
        raced = true;
        fake.discounts.set(
          'other',
          buildDiscount('contrast-look', ['p', 'q'], { id: 'other' })
        );
        throw new LookApiError('createDiscount', 'duplicate', undefined, {
          code: 'DuplicateField',
        });
      }
      return original(draft);
    };
    const { plan } = await saveNewLook(fake.api, input);
    expect(plan.look.key).toBe('contrast-look-2');
    expect(fake.discounts.size).toBe(2);
  });

  it('attaches the plan to a failed step so the UI can resume', async () => {
    const fake = createFakeLookApi();
    fake.failNext(
      'writeLookObject',
      new LookApiError('writeLookObject', 'network', undefined)
    );
    const error = await saveNewLook(fake.api, input).catch((e) => e);
    expect(error).toBeInstanceOf(SaveStepError);
    expect(error.plan.look.key).toBe('contrast-look');
    expect(planMatches(error.plan, input)).toBe(true);
    expect(
      planMatches(error.plan, {
        ...input,
        setPrice: { EUR: 26000, CHF: 29700 },
      })
    ).toBe(false);
  });

  it('names the discount only in the languages that were filled, key from the first available name', async () => {
    const fake = createFakeLookApi();
    const { plan } = await saveNewLook(fake.api, {
      ...input,
      label: { fr: 'Look contraste', de: 'Kontrast-Look' },
    });
    expect(plan.look.key).toBe('kontrast-look');
    const [discount] = [...fake.discounts.values()];
    expect(discount.name).toEqual({
      fr: 'Look set: Look contraste',
      de: 'Look-Set: Kontrast-Look',
    });
    expect(discount.description).toEqual({
      fr: 'Look contraste',
      de: 'Kontrast-Look',
    });
  });

  it('uses a chosen key as given instead of deriving one', async () => {
    const fake = createFakeLookApi();
    const { plan } = await saveNewLook(fake.api, {
      ...input,
      key: '  winter-2026  ',
    });
    expect(plan.look.key).toBe('winter-2026');
    expect(fake.objects.has('look-winter-2026')).toBe(true);
    expect([...fake.discounts.values()][0].key).toBe('look-winter-2026');
  });

  it('refuses a chosen key that is taken and never renames it or writes anything', async () => {
    const fake = createFakeLookApi({
      objects: [buildObject('winter', ['x', 'y'])],
      discounts: [buildDiscount('winter', ['x', 'y'])],
    });
    const error = await saveNewLook(fake.api, {
      ...input,
      key: 'winter',
    }).catch((e) => e);
    expect(error).toBeInstanceOf(LookKeyTakenError);
    expect(error.key).toBe('look-winter');
    expect(fake.callsTo('createCartDiscount')).toHaveLength(0);
    expect(fake.callsTo('writeLookObject')).toHaveLength(0);
  });

  it('does not re-derive a chosen key when it is taken during the save', async () => {
    const fake = createFakeLookApi();
    const original = fake.api.createCartDiscount;
    let raced = false;
    fake.api.createCartDiscount = async (draft) => {
      if (!raced) {
        raced = true;
        fake.discounts.set(
          'other',
          buildDiscount('mine', ['p', 'q'], { id: 'other' })
        );
        throw new LookApiError('createDiscount', 'duplicate', undefined, {
          code: 'DuplicateField',
        });
      }
      return original(draft);
    };
    await expect(
      saveNewLook(fake.api, { ...input, key: 'mine' })
    ).rejects.toBeInstanceOf(LookKeyTakenError);
    expect(fake.discounts.size).toBe(1);
  });

  it('resumes a failed save with a chosen key', async () => {
    const fake = createFakeLookApi();
    fake.failNext(
      'writeLookObject',
      new LookApiError('writeLookObject', 'network', undefined)
    );
    const error = await saveNewLook(fake.api, { ...input, key: 'mine' }).catch(
      (e) => e
    );
    expect(planMatches(error.plan, { ...input, key: 'mine' })).toBe(true);
    await runSave(fake.api, error.plan, error.progress);
    expect(fake.discounts.size).toBe(1);
    expect(fake.objects.has('look-mine')).toBe(true);
  });
});
