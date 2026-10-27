import { isConflict, isDuplicate, LookApiError } from './errors';
import { deriveLookKey, keySourceName, lookObjectKey } from './keys';
import {
  buildLookCartDiscountDrafts,
  buildLookDiscountGroupDraft,
  changeIsActiveAction,
  setGroupActiveAction,
} from './look-actions';
import type { LookApi } from './look-api';
import { LOOK_CONTAINER } from './limits';
import { buildLookValue } from './look-value';
import { takenLookKeys } from './look-rows';
import { nextSortOrder } from './sort-order';
import type { LookInput, LookValue, NewLook } from './types';

export interface SavePlan {
  look: LookInput;
  /** The rank of the look's Discount Group. */
  sortOrder: string;
}

export type SaveStep = 'discount' | 'object' | 'activation';

/** How far a save got; passed back in to resume after a failed step. */
export interface SaveProgress {
  /** The look's Discount Group `look-<key>`. */
  group?: { id: string; version: number };
  /** The main discount `look-<key>`. */
  discount?: { id: string; version: number };
  /** The country discounts written so far, by key. */
  countryDiscounts?: Record<string, { id: string; version: number }>;
  objectWritten: boolean;
  activated: boolean;
}

export const NO_PROGRESS: SaveProgress = {
  objectWritten: false,
  activated: false,
};

/** `activate`: whether saving ends with `changeIsActive: true` (step 3). */
export interface SaveOptions {
  activate?: boolean;
}

/** A save step failed; `progress` says what is already written. */
export class SaveStepError extends Error {
  readonly step: SaveStep;
  readonly progress: SaveProgress;
  readonly original: unknown;
  plan?: SavePlan;

  constructor(step: SaveStep, progress: SaveProgress, original: unknown) {
    super(original instanceof Error ? original.message : String(original));
    this.name = 'SaveStepError';
    this.step = step;
    this.progress = progress;
    this.original = original;
  }
}

/** The derived key (or rank) is held by another look: re-plan. */
export class LookKeyTakenError extends Error {
  constructor(readonly step: SaveStep, readonly key: string) {
    super(`The look key "${key}" is already taken (${step}).`);
    this.name = 'LookKeyTakenError';
  }
}

const sameValue = (a: LookValue, b: LookValue): boolean =>
  JSON.stringify(buildLookValue(a)) === JSON.stringify(buildLookValue(b));

/**
 * Plans a new look: reads every look object and Cart Discount, derives the
 * next free look key and the lowest free rank (0.7 to 0.799, no trailing zero).
 */
export async function planNewLook(
  api: LookApi,
  input: NewLook
): Promise<SavePlan> {
  const [objects, discounts, groups] = await Promise.all([
    api.fetchLookObjects(),
    api.fetchCartDiscounts(),
    api.fetchDiscountGroups(),
  ]);
  const taken = takenLookKeys(objects, discounts);
  // A key the user chose is never changed silently: a taken one is an error.
  const chosen = input.key?.trim();
  if (chosen && taken.has(chosen)) {
    throw new LookKeyTakenError('discount', lookObjectKey(chosen));
  }
  const key = chosen || deriveLookKey(keySourceName(input.label), taken);
  // The rank is unique among all Cart Discounts and Discount Groups.
  const sortOrder = nextSortOrder([
    ...discounts.map((d) => d.sortOrder),
    ...groups.map((g) => g.sortOrder),
  ]);
  return { look: { ...input, key }, sortOrder };
}

/** Re-reads the group and every written discount (versions may have moved,
 *  a lost response may already have switched one on). */
async function refreshDiscounts(
  api: LookApi,
  progress: SaveProgress,
  groupKey: string
): Promise<void> {
  let allActive = true;
  const read = async (entry: { id: string }) => {
    const current = await api.getCartDiscount(entry.id);
    allActive = allActive && current.isActive;
    return { id: current.id, version: current.version };
  };
  const group = await api.getDiscountGroupByKey(groupKey);
  if (group) {
    progress.group = { id: group.id, version: group.version };
    allActive = allActive && group.isActive;
  }
  const others = progress.countryDiscounts ?? {};
  for (const key of Object.keys(others)) others[key] = await read(others[key]);
  if (progress.discount) progress.discount = await read(progress.discount);
  progress.activated = allActive;
}

/**
 * Writes a planned look in the order that never leaves a half look live:
 * 1. the look's Discount Group, inactive;
 * 2. the set-price Cart Discounts of its countries, inactive, in the group;
 * 3. the Custom Object;
 * 4. only when `options.activate`: the group on, then the country discounts,
 *    the main discount last.
 * Each step checks by key first, so a retry with the returned progress
 * continues where it stopped and never creates a duplicate.
 */
export async function runSave(
  api: LookApi,
  plan: SavePlan,
  start: SaveProgress = NO_PROGRESS,
  options: SaveOptions = {}
): Promise<SaveProgress> {
  const activate = options.activate ?? false;
  const progress: SaveProgress = { ...start };
  const key = lookObjectKey(plan.look.key);

  let groupActive = false;
  if (!progress.group) {
    try {
      const existing = await api.getDiscountGroupByKey(key);
      const group =
        existing ??
        (await api.createDiscountGroup(
          buildLookDiscountGroupDraft(plan.look, {
            sortOrder: plan.sortOrder,
            isActive: false,
          })
        ));
      groupActive = group.isActive;
      progress.group = { id: group.id, version: group.version };
    } catch (error) {
      if (isDuplicate(error)) throw new LookKeyTakenError('discount', key);
      throw new SaveStepError('discount', progress, error);
    }
  }

  const drafts = buildLookCartDiscountDrafts(plan.look, { isActive: false });
  progress.countryDiscounts = { ...(start.countryDiscounts ?? {}) };
  let allActive = groupActive;
  for (const [index, draft] of drafts.entries()) {
    const written =
      index === 0 ? progress.discount : progress.countryDiscounts[draft.key];
    if (written) continue;
    try {
      const existing = await api.getCartDiscountByKey(draft.key);
      let entry: { id: string; version: number };
      if (existing) {
        const same =
          JSON.stringify(existing.pieceIds) ===
          JSON.stringify(plan.look.componentProductIds);
        if (!same) throw new LookKeyTakenError('discount', draft.key);
        entry = { id: existing.id, version: existing.version };
        allActive = allActive && existing.isActive;
      } else {
        const created = await api.createCartDiscount(draft);
        entry = { id: created.id, version: created.version };
        allActive = false;
      }
      if (index === 0) progress.discount = entry;
      else progress.countryDiscounts[draft.key] = entry;
    } catch (error) {
      if (error instanceof LookKeyTakenError) throw error;
      if (isDuplicate(error))
        throw new LookKeyTakenError('discount', draft.key);
      throw new SaveStepError('discount', progress, error);
    }
  }
  if (drafts.length > 0 && !start.discount) progress.activated = allActive;

  if (!progress.objectWritten) {
    try {
      const value = buildLookValue(plan.look);
      const existing = await api.getLookObject(key);
      if (existing) {
        if (!sameValue(existing.value, value)) {
          throw new SaveStepError(
            'object',
            progress,
            new LookKeyTakenError('object', key)
          );
        }
      } else {
        await api.writeLookObject({ container: LOOK_CONTAINER, key, value });
      }
      progress.objectWritten = true;
    } catch (error) {
      throw error instanceof SaveStepError
        ? error
        : new SaveStepError('object', progress, error);
    }
  }

  if (activate && !progress.activated) {
    try {
      // A resumed activation re-reads the group and the discounts first.
      if (start.discount) await refreshDiscounts(api, progress, key);
      if (!progress.activated) {
        // The group goes on first (with inactive discounts nothing applies
        // yet); the main discount decides the look's status and goes last.
        const group = progress.group as { id: string; version: number };
        const switched = await api.updateDiscountGroup(
          group.id,
          group.version,
          [setGroupActiveAction(true)],
          'switchDiscountGroup'
        );
        progress.group = { id: switched.id, version: switched.version };
        const countries = progress.countryDiscounts ?? {};
        for (const countryKey of Object.keys(countries)) {
          const updated = await api.updateCartDiscount(
            countries[countryKey].id,
            countries[countryKey].version,
            [changeIsActiveAction(true)],
            'activateDiscount'
          );
          countries[countryKey] = { id: updated.id, version: updated.version };
        }
        const main = progress.discount as { id: string; version: number };
        const updated = await api.updateCartDiscount(
          main.id,
          main.version,
          [changeIsActiveAction(true)],
          'activateDiscount'
        );
        progress.discount = { id: updated.id, version: updated.version };
        progress.activated = true;
      }
    } catch (error) {
      if (isConflict(error))
        await refreshDiscounts(api, progress, key).catch(() => undefined);
      throw new SaveStepError('activation', progress, error);
    }
  }

  return progress;
}

/** True when a plan from a failed save still describes what the user has
 *  entered now, so resuming it writes exactly that look. */
export function planMatches(plan: SavePlan, input: NewLook): boolean {
  const { key: _key, ...planned } = plan.look;
  const { key: _chosen, ...entered } = input;
  void _key;
  void _chosen;
  return JSON.stringify(planned) === JSON.stringify(entered);
}

function attachPlan(error: unknown, plan: SavePlan): unknown {
  if (error instanceof SaveStepError) error.plan = plan;
  return error;
}

/**
 * Plans and saves a new look. When the discount create fails on the key (two
 * users saving the same name at once), it re-reads, derives the next free
 * key and rank and retries once.
 */
export async function saveNewLook(
  api: LookApi,
  input: NewLook,
  options: SaveOptions = {}
): Promise<{ plan: SavePlan; progress: SaveProgress }> {
  let plan = await planNewLook(api, input);
  try {
    return { plan, progress: await runSave(api, plan, NO_PROGRESS, options) };
  } catch (error) {
    if (!(error instanceof LookKeyTakenError)) throw attachPlan(error, plan);
    // A key the user chose is not replaced behind their back.
    if (input.key?.trim()) throw error;
    plan = await planNewLook(api, input);
    try {
      return { plan, progress: await runSave(api, plan, NO_PROGRESS, options) };
    } catch (retryError) {
      throw attachPlan(retryError, plan);
    }
  }
}

export { LookApiError };
