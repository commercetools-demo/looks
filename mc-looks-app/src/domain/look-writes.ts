import { isConflict, LookApiError } from './errors';
import { lookObjectKey } from './keys';
import {
  buildLookCartDiscountDraft,
  changeIsActiveAction,
  changeValueAction,
  discountAmounts,
  nameActions,
} from './look-actions';
import type { LookApi } from './look-api';
import { LOOK_CONTAINER } from './limits';
import { buildLookValue } from './look-value';
import type { LookRow } from './look-rows';
import { nextSortOrder } from './sort-order';
import type { LookDiscount, LookImage, LookObject, Money } from './types';

/**
 * Records or clears the end date of a look in its Custom Object: `endedAt`
 * set to the given ISO time, or removed when `undefined`; every other field
 * stays. Re-reads the object for its current `version`; writes nothing when
 * the value already says so or the object is missing.
 */
export async function recordLookEnd(
  api: LookApi,
  objectKey: string,
  endedAt: string | undefined
): Promise<LookObject | undefined> {
  const current = await api.getLookObject(objectKey);
  if (!current) return undefined;
  if (current.value.endedAt === endedAt) return current;
  return api.writeLookObject({
    container: LOOK_CONTAINER,
    key: objectKey,
    value: buildLookValue({ ...current.value, endedAt }),
    version: current.version,
  });
}

/**
 * Switches a look on or off: `changeIsActive` on the discount with its
 * current `version`. On a conflict the discount is re-read and returned as
 * it is now; the write is not retried blindly. After a successful switch,
 * when `objectKey` is given, the object records the end date (set when
 * switched off, cleared when switched on). That second write is best
 * effort and never fails the switch.
 */
export async function switchLook(
  api: LookApi,
  discount: Pick<LookDiscount, 'id' | 'version'>,
  isActive: boolean,
  options: { objectKey?: string; now?: Date } = {}
): Promise<{
  outcome: 'updated' | 'conflict';
  discount: LookDiscount;
  object?: LookObject;
}> {
  let updated: LookDiscount;
  try {
    updated = await api.updateCartDiscount(
      discount.id,
      discount.version,
      [changeIsActiveAction(isActive)],
      'switchDiscount'
    );
  } catch (error) {
    if (isConflict(error)) {
      return {
        outcome: 'conflict',
        discount: await api.getCartDiscount(discount.id),
      };
    }
    throw error;
  }
  if (!options.objectKey) return { outcome: 'updated', discount: updated };
  try {
    const endedAt = isActive
      ? undefined
      : (options.now ?? new Date()).toISOString();
    const object = await recordLookEnd(api, options.objectKey, endedAt);
    return {
      outcome: 'updated',
      discount: updated,
      ...(object ? { object } : {}),
    };
  } catch {
    return { outcome: 'updated', discount: updated };
  }
}

export type SetPriceStep = 'discount' | 'object';

export class SetPriceStepError extends Error {
  constructor(
    readonly step: SetPriceStep,
    readonly discountChanged: boolean,
    readonly original: unknown
  ) {
    super(original instanceof Error ? original.message : String(original));
    this.name = 'SetPriceStepError';
  }
}

const sameMoney = (a: Money, b: Money): boolean =>
  JSON.stringify(Object.entries(a).sort()) ===
  JSON.stringify(Object.entries(b).sort());

/**
 * Changes a look's set price: first `changeValue` on the discount with the
 * amount recomputed from today's live sum, then the object's `setPrice` with
 * the object's current `version`. `discountChanged` retries only step 2.
 * Makes no call when nothing changes (set price and amounts already match).
 */
export async function changeSetPrice(
  api: LookApi,
  row: Pick<LookRow, 'objectKey' | 'discount' | 'object'>,
  setPrice: Money,
  liveSum: Money,
  options: { discountChanged?: boolean } = {}
): Promise<{
  discount?: LookDiscount;
  object: LookObject;
  unchanged: boolean;
}> {
  if (!row.discount || !row.object) {
    throw new Error(
      'changeSetPrice needs a complete look (object and discount).'
    );
  }
  const wanted = discountAmounts(liveSum, setPrice);
  if (
    !options.discountChanged &&
    sameMoney(row.object.value.setPrice, setPrice) &&
    sameMoney(row.discount.amount, wanted)
  ) {
    return { object: row.object, unchanged: true };
  }

  let discount: LookDiscount | undefined;
  if (!options.discountChanged && !sameMoney(row.discount.amount, wanted)) {
    try {
      // The row can be older than the last write, so the version is read now.
      const current = await api.getCartDiscount(row.discount.id);
      discount = await api.updateCartDiscount(
        current.id,
        current.version,
        [changeValueAction(liveSum, setPrice)],
        'changeDiscountValue'
      );
    } catch (error) {
      // A lost response may still have been applied: read again and say so,
      // so the retry only writes the object.
      let applied = false;
      try {
        applied = sameMoney(
          (await api.getCartDiscount(row.discount.id)).amount,
          wanted
        );
      } catch {
        applied = false;
      }
      throw new SetPriceStepError('discount', applied, error);
    }
  }

  try {
    const current = await api.getLookObject(row.objectKey);
    if (!current) throw new Error('The look definition no longer exists.');
    const object = await api.writeLookObject({
      container: LOOK_CONTAINER,
      key: row.objectKey,
      value: buildLookValue({ ...current.value, setPrice }),
      version: current.version,
    });
    return { discount, object, unchanged: false };
  } catch (error) {
    throw new SetPriceStepError('object', true, error);
  }
}

/** Sets or clears the look photo; keeps every other field (`endedAt` too).
 *  Makes no call when the photo is already as given. */
export async function changePhoto(
  api: LookApi,
  objectKey: string,
  image: LookImage | undefined
): Promise<{ object: LookObject; unchanged: boolean }> {
  const current = await api.getLookObject(objectKey);
  if (!current) throw new Error('The look definition no longer exists.');
  if (JSON.stringify(current.value.image) === JSON.stringify(image)) {
    return { object: current, unchanged: true };
  }
  const { image: _old, ...rest } = current.value;
  void _old;
  const object = await api.writeLookObject({
    container: LOOK_CONTAINER,
    key: objectKey,
    value: buildLookValue({ ...rest, ...(image ? { image } : {}) }),
    version: current.version,
  });
  return { object, unchanged: false };
}

/**
 * Completes a half look without changing whether it is live.
 * - Missing object: rebuilt from the discount (pieces from its target, set
 *   price = live sum minus discount amount per currency).
 * - Missing discount: created inactive from the object under the given name.
 */
export async function completeLook(
  api: LookApi,
  row: LookRow,
  input: { liveSum: Money; label?: { de: string; en: string } }
): Promise<void> {
  if (row.completeness === 'missing-object' && row.discount) {
    const setPrice: Money = {};
    for (const [currency, amount] of Object.entries(row.discount.amount)) {
      const sum = input.liveSum[currency];
      if (sum === undefined) {
        throw new LookApiError('completeDiscount', 'unknown', undefined, {
          message: `No live sum in ${currency}`,
        });
      }
      setPrice[currency] = sum - amount;
    }
    await api.writeLookObject({
      container: LOOK_CONTAINER,
      key: row.objectKey,
      value: buildLookValue({
        componentProductIds: row.discount.pieceIds,
        setPrice,
      }),
    });
    return;
  }
  if (row.completeness === 'missing-discount' && row.object && input.label) {
    const discounts = await api.fetchCartDiscounts();
    const lookKey = row.lookKey;
    await api.createCartDiscount(
      buildLookCartDiscountDraft(
        {
          key: lookKey,
          label: input.label,
          componentProductIds: row.object.value.componentProductIds,
          setPrice: row.object.value.setPrice,
          sum: input.liveSum,
        },
        {
          sortOrder: nextSortOrder(discounts.map((d) => d.sortOrder)),
          isActive: false,
        }
      )
    );
    return;
  }
  throw new Error('This look cannot be completed.');
}

export { lookObjectKey, nameActions };
