import { LookApiError } from './errors';
import { createFakeLookApi } from '../test-utils/fake-look-api';
import { buildDiscount, buildObject } from '../test-utils/fixtures';
import {
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
    expect(plan.sortOrder).toBe('0.701');
  });
});

describe('runSave', () => {
  const plan = { look: { key: 'contrast-look', ...input }, sortOrder: '0.7' };

  it('writes discount, object, and activation in this order', async () => {
    const fake = createFakeLookApi();
    const progress = await runSave(fake.api, plan, NO_PROGRESS, {
      activate: true,
    });
    expect(
      fake.calls
        .map((c) => c.method)
        .filter((m) =>
          [
            'createCartDiscount',
            'writeLookObject',
            'updateCartDiscount',
          ].includes(m)
        )
    ).toEqual(['createCartDiscount', 'writeLookObject', 'updateCartDiscount']);
    expect(progress).toMatchObject({ objectWritten: true, activated: true });
    expect(fake.discounts.get('d1')!.isActive).toBe(true);
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

  it.each([
    ['createCartDiscount', 'discount'],
    ['writeLookObject', 'object'],
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
      expect(fake.objects.size).toBe(1);
      expect([...fake.discounts.values()][0].isActive).toBe(true);
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
      'd1',
      1,
      [{ changeIsActive: { isActive: false } }],
      'switchDiscount'
    );
    const progress = await runSave(fake.api, plan, failure.progress, {
      activate: true,
    });
    expect(progress.activated).toBe(true);
    expect(fake.discounts.get('d1')!.isActive).toBe(true);
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
});
