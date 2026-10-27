import { isConflict, isDuplicate, LookApiError } from './errors';
import { deriveLookKey, lookObjectKey } from './keys';
import {
  buildLookCartDiscountDraft,
  changeIsActiveAction,
} from './look-actions';
import type { LookApi } from './look-api';
import { LOOK_CONTAINER } from './limits';
import { buildLookValue } from './look-value';
import { takenLookKeys } from './look-rows';
import { nextSortOrder } from './sort-order';
import type { LookInput, LookValue, NewLook } from './types';

export interface SavePlan {
  look: LookInput;
  sortOrder: string;
}

export type SaveStep = 'discount' | 'object' | 'activation';

/** How far a save got; passed back in to resume after a failed step. */
export interface SaveProgress {
  discount?: { id: string; version: number };
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
  const [objects, discounts] = await Promise.all([
    api.fetchLookObjects(),
    api.fetchCartDiscounts(),
  ]);
  const key = deriveLookKey(input.label.en, takenLookKeys(objects, discounts));
  const sortOrder = nextSortOrder(discounts.map((d) => d.sortOrder));
  return { look: { key, ...input }, sortOrder };
}

async function refreshDiscount(
  api: LookApi,
  progress: SaveProgress
): Promise<void> {
  const current = await api.getCartDiscount(
    (progress.discount as { id: string }).id
  );
  progress.discount = { id: current.id, version: current.version };
  progress.activated = current.isActive;
}

/**
 * Writes a planned look in the order that never leaves a half look live:
 * 1. the set-price Cart Discount, inactive;
 * 2. the Custom Object;
 * 3. `changeIsActive: true` on the discount, only when `options.activate`.
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

  if (!progress.discount) {
    try {
      const existing = await api.getCartDiscountByKey(key);
      if (existing) {
        const same =
          JSON.stringify(existing.pieceIds) ===
          JSON.stringify(plan.look.componentProductIds);
        if (!same) throw new LookKeyTakenError('discount', key);
        progress.discount = { id: existing.id, version: existing.version };
        progress.activated = existing.isActive;
      } else {
        const created = await api.createCartDiscount(
          buildLookCartDiscountDraft(plan.look, {
            sortOrder: plan.sortOrder,
            isActive: false,
          })
        );
        progress.discount = { id: created.id, version: created.version };
      }
    } catch (error) {
      if (error instanceof LookKeyTakenError) throw error;
      if (isDuplicate(error)) throw new LookKeyTakenError('discount', key);
      throw new SaveStepError('discount', progress, error);
    }
  }

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
      // A resumed activation re-reads the discount first (its version may
      // have moved, or a lost response may already have switched it on).
      if (start.discount) await refreshDiscount(api, progress);
      if (!progress.activated) {
        const discount = progress.discount as { id: string; version: number };
        const updated = await api.updateCartDiscount(
          discount.id,
          discount.version,
          [changeIsActiveAction(true)],
          'activateDiscount'
        );
        progress.discount = { id: updated.id, version: updated.version };
        progress.activated = true;
      }
    } catch (error) {
      if (isConflict(error))
        await refreshDiscount(api, progress).catch(() => undefined);
      throw new SaveStepError('activation', progress, error);
    }
  }

  return progress;
}

/** True when a plan from a failed save still describes what the user has
 *  entered now, so resuming it writes exactly that look. */
export function planMatches(plan: SavePlan, input: NewLook): boolean {
  const { key: _key, ...planned } = plan.look;
  void _key;
  return JSON.stringify(planned) === JSON.stringify({ ...input });
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
    plan = await planNewLook(api, input);
    try {
      return { plan, progress: await runSave(api, plan, NO_PROGRESS, options) };
    } catch (retryError) {
      throw attachPlan(retryError, plan);
    }
  }
}

export { LookApiError };
