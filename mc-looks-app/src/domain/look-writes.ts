import { isConflict, LookApiError } from './errors';
import { lookDiscountKey, lookObjectKey } from './keys';
import { priceKey } from './prices';
import {
  buildCountryDiscountDraft,
  buildLookCartDiscountDrafts,
  changeIsActiveAction,
  changeValueAction,
  groupAmounts,
  groupPriceKeys,
  nameActions,
  setGroupActiveAction,
} from './look-actions';
import { ensureLookGroup } from './look-group';
import type { LookApi } from './look-api';
import { LOOK_CONTAINER } from './limits';
import { buildLookValue } from './look-value';
import type { LookRow } from './look-rows';
import type {
  LocalizedValue,
  LookDiscount,
  LookImage,
  LookObject,
  Money,
} from './types';

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
 * Switches a look on or off: `changeIsActive` on its discounts with their
 * current `version`s. The main discount decides the status, so it goes on
 * last and off first; the country discounts follow or lead. On a conflict on
 * the main discount it is re-read and returned as it is now; the write is not
 * retried blindly. After a successful switch, when `objectKey` is given, the
 * object records the end date (set when switched off, cleared when switched
 * on). That second write is best effort and never fails the switch.
 */
export async function switchLook(
  api: LookApi,
  discount: Pick<LookDiscount, 'id' | 'version'>,
  isActive: boolean,
  options: {
    objectKey?: string;
    now?: Date;
    countryDiscounts?: Array<Pick<LookDiscount, 'id' | 'version'>>;
  } = {}
): Promise<{
  outcome: 'updated' | 'conflict';
  discount: LookDiscount;
  /** The country discounts as written, to replace the stale ones. */
  countryDiscounts: LookDiscount[];
  object?: LookObject;
}> {
  const written: LookDiscount[] = [];
  const switchCountry = async (entry: Pick<LookDiscount, 'id' | 'version'>) => {
    try {
      written.push(
        await api.updateCartDiscount(
          entry.id,
          entry.version,
          [changeIsActiveAction(isActive)],
          'switchDiscount'
        )
      );
    } catch (error) {
      if (!isConflict(error)) throw error;
      // The country discount moved on: read its version and write once more.
      const current = await api.getCartDiscount(entry.id);
      written.push(
        current.isActive === isActive
          ? current
          : await api.updateCartDiscount(
              current.id,
              current.version,
              [changeIsActiveAction(isActive)],
              'switchDiscount'
            )
      );
    }
  };
  const switchMain = async (): Promise<LookDiscount | 'conflict'> => {
    try {
      return await api.updateCartDiscount(
        discount.id,
        discount.version,
        [changeIsActiveAction(isActive)],
        'switchDiscount'
      );
    } catch (error) {
      if (isConflict(error)) return 'conflict';
      throw error;
    }
  };

  // The look's Discount Group goes first in both directions: switched on
  // before the (still inactive) discounts nothing applies yet, switched off
  // the look stops applying at once. A look without a group (created before
  // groups) has nothing to switch here.
  if (options.objectKey) {
    const group = await api.getDiscountGroupByKey(options.objectKey);
    if (group && group.isActive !== isActive) {
      await api.updateDiscountGroup(
        group.id,
        group.version,
        [setGroupActiveAction(isActive)],
        'switchDiscountGroup'
      );
    }
  }

  const countries = options.countryDiscounts ?? [];
  let updated: LookDiscount | 'conflict';
  if (isActive) {
    for (const entry of countries) await switchCountry(entry);
    updated = await switchMain();
  } else {
    updated = await switchMain();
    if (updated !== 'conflict') {
      for (const entry of countries) await switchCountry(entry);
    }
  }
  if (updated === 'conflict') {
    return {
      outcome: 'conflict',
      discount: await api.getCartDiscount(discount.id),
      countryDiscounts: written,
    };
  }
  if (!options.objectKey) {
    return { outcome: 'updated', discount: updated, countryDiscounts: written };
  }
  try {
    const endedAt = isActive
      ? undefined
      : (options.now ?? new Date()).toISOString();
    const object = await recordLookEnd(api, options.objectKey, endedAt);
    return {
      outcome: 'updated',
      discount: updated,
      countryDiscounts: written,
      ...(object ? { object } : {}),
    };
  } catch {
    return { outcome: 'updated', discount: updated, countryDiscounts: written };
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
 * Changes a look's set prices: first the discounts (`changeValue` per country
 * with the amount recomputed from today's live sum, a missing country
 * discount is created), then the object's `setPrice` with the object's
 * current `version`. `discountChanged` retries only step 2. Makes no call
 * when nothing changes (set prices and amounts already match).
 */
export async function changeSetPrice(
  api: LookApi,
  row: Pick<
    LookRow,
    | 'objectKey'
    | 'lookKey'
    | 'discount'
    | 'countryDiscounts'
    | 'object'
    | 'name'
  >,
  setPrice: Money,
  liveSum: Money,
  options: { discountChanged?: boolean } = {}
): Promise<{
  discount?: LookDiscount;
  /** Every discount written (main and country), to replace the stale ones. */
  discounts: LookDiscount[];
  object: LookObject;
  unchanged: boolean;
}> {
  if (!row.discount || !row.object) {
    throw new Error(
      'changeSetPrice needs a complete look (object and discount).'
    );
  }
  const main = row.discount;
  const known = [main, ...row.countryDiscounts];
  const groups = groupPriceKeys(Object.keys(setPrice));
  const knownFor = (country: string) =>
    known.find((discount) => discount.country === country);
  const discountsMatch = groups.every((group) => {
    const current = knownFor(group.country);
    return (
      !!current &&
      sameMoney(current.amount, groupAmounts(group, liveSum, setPrice))
    );
  });
  if (
    !options.discountChanged &&
    sameMoney(row.object.value.setPrice, setPrice) &&
    discountsMatch
  ) {
    return { discounts: [], object: row.object, unchanged: true };
  }

  let discount: LookDiscount | undefined;
  const discounts: LookDiscount[] = [];
  if (!options.discountChanged && !discountsMatch) {
    try {
      for (const group of groups) {
        const wanted = groupAmounts(group, liveSum, setPrice);
        let current: LookDiscount | undefined = knownFor(group.country);
        if (current && sameMoney(current.amount, wanted)) continue;
        if (current) {
          // The row can be older than the last write: read the version now.
          current = await api.getCartDiscount(current.id);
        } else {
          current = await api.getCartDiscountByKey(
            lookDiscountKey(row.lookKey, group.country, false)
          );
        }
        let written: LookDiscount;
        if (current) {
          written = sameMoney(current.amount, wanted)
            ? current
            : await api.updateCartDiscount(
                current.id,
                current.version,
                [changeValueAction(wanted)],
                'changeDiscountValue'
              );
        } else {
          // The look's group (created now for a look from before groups).
          await ensureLookGroup(
            api,
            { key: row.lookKey, label: row.name ?? {} },
            main.isActive
          );
          written = await api.createCartDiscount(
            buildCountryDiscountDraft(
              {
                key: row.lookKey,
                label: row.name ?? {},
                componentProductIds: row.object.value.componentProductIds,
                setPrice,
                sum: liveSum,
              },
              group,
              { isActive: main.isActive, isMain: false }
            )
          );
        }
        discounts.push(written);
        if (written.id === main.id) discount = written;
      }
    } catch (error) {
      // A lost response may still have been applied: read again and say so,
      // so the retry only writes the object.
      let applied = false;
      try {
        applied = true;
        for (const group of groups) {
          const current = knownFor(group.country);
          const read = current
            ? await api.getCartDiscount(current.id)
            : await api.getCartDiscountByKey(
                lookDiscountKey(row.lookKey, group.country, false)
              );
          if (
            !read ||
            !sameMoney(read.amount, groupAmounts(group, liveSum, setPrice))
          ) {
            applied = false;
          }
        }
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
    return { discount, discounts, object, unchanged: false };
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
  input: { liveSum: Money; label?: LocalizedValue }
): Promise<void> {
  if (row.completeness === 'missing-object' && row.discount) {
    const setPrice: Money = {};
    for (const discount of [row.discount, ...row.countryDiscounts]) {
      for (const [currency, amount] of Object.entries(discount.amount)) {
        const key = priceKey(currency, discount.country);
        const sum = input.liveSum[key];
        if (sum === undefined) {
          throw new LookApiError('completeDiscount', 'unknown', undefined, {
            message: `No live sum in ${key}`,
          });
        }
        setPrice[key] = sum - amount;
      }
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
    await ensureLookGroup(api, { key: row.lookKey, label: input.label }, false);
    const have = new Set(row.countryDiscounts.map((d) => d.key));
    const look = {
      key: row.lookKey,
      label: input.label,
      componentProductIds: row.object.value.componentProductIds,
      setPrice: row.object.value.setPrice,
      sum: input.liveSum,
    };
    const drafts = buildLookCartDiscountDrafts(look, {
      isActive: false,
    }).filter((draft) => !have.has(draft.key));
    for (const draft of drafts) await api.createCartDiscount(draft);
    return;
  }
  throw new Error('This look cannot be completed.');
}

export { lookObjectKey, nameActions };
