import { isValidLookKey } from './keys';
import { isLookImagePath } from './look-value';
import { LOOK_MAX_PIECES, LOOK_MIN_PIECES } from './limits';
import { sumListPrices } from './prices';
import type { Money, NewLook } from './types';

export type ValidationCode =
  | 'name-missing'
  | 'key-invalid'
  | 'pieces-count'
  | 'piece-duplicate'
  | 'set-price-none'
  | 'set-price-not-positive'
  | 'set-price-not-below-sum'
  | 'sum-not-live'
  | 'image-invalid';

export type ValidationField = 'label' | 'key' | 'pieces' | 'setPrice' | 'image';

export interface ValidationError {
  code: ValidationCode;
  field: ValidationField;
  productId?: string;
  currency?: string;
}

/**
 * The save rules (FR-035). An empty result means the look may be written.
 * `livePrices` holds today's list prices per piece and price cell; `keys`
 * are the cells to consider (`lookPriceKeys`). Every cell all pieces have a
 * price in needs a set price below its sum; a piece missing a cell leaves
 * that cell out.
 */
export function validateLook(
  look: Pick<
    NewLook,
    'key' | 'label' | 'componentProductIds' | 'setPrice' | 'sum' | 'image'
  >,
  livePrices: Map<string, Money>,
  keys: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // One name is enough; readers fall back de, en, first. Empty ones are omitted.
  if (!Object.values(look.label).some((text) => text.trim())) {
    errors.push({ code: 'name-missing', field: 'label' });
  }

  if (look.key !== undefined && !isValidLookKey(look.key)) {
    errors.push({ code: 'key-invalid', field: 'key' });
  }

  if (look.image) {
    const { path, width, height } = look.image;
    const sizeOk =
      Number.isInteger(width) &&
      width > 0 &&
      Number.isInteger(height) &&
      height > 0;
    if (!isLookImagePath(path) || !sizeOk) {
      errors.push({ code: 'image-invalid', field: 'image' });
    }
  }

  const ids = look.componentProductIds;
  if (ids.length < LOOK_MIN_PIECES || ids.length > LOOK_MAX_PIECES) {
    errors.push({ code: 'pieces-count', field: 'pieces' });
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      errors.push({ code: 'piece-duplicate', field: 'pieces', productId: id });
      continue;
    }
    seen.add(id);
  }

  const liveSum = sumListPrices(ids, livePrices, keys);
  // A cell without a set price gets no discount and is not checked.
  const cells = keys.filter(
    (key) => liveSum[key] !== undefined && look.setPrice[key] !== undefined
  );
  if (cells.length === 0 && ids.length > 0) {
    errors.push({ code: 'set-price-none', field: 'setPrice' });
  }
  for (const currency of cells) {
    const setPrice = look.setPrice[currency];
    if (!Number.isInteger(setPrice) || setPrice <= 0) {
      errors.push({
        code: 'set-price-not-positive',
        field: 'setPrice',
        currency,
      });
      continue;
    }
    const sum = liveSum[currency];
    if (setPrice >= sum) {
      errors.push({
        code: 'set-price-not-below-sum',
        field: 'setPrice',
        currency,
      });
    }
    if (look.sum[currency] !== sum) {
      errors.push({ code: 'sum-not-live', field: 'setPrice', currency });
    }
  }

  return errors;
}
