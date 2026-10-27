import { isLookImagePath } from './look-value';
import { LOOK_MAX_PIECES, LOOK_MIN_PIECES } from './limits';
import { sumListPrices } from './prices';
import type { LookInput, Money } from './types';

export type ValidationCode =
  | 'name-missing'
  | 'pieces-count'
  | 'piece-duplicate'
  | 'piece-price-missing'
  | 'set-price-not-positive'
  | 'set-price-not-below-sum'
  | 'sum-not-live'
  | 'image-invalid';

export type ValidationField =
  | 'label.de'
  | 'label.en'
  | 'pieces'
  | 'setPrice'
  | 'image';

export interface ValidationError {
  code: ValidationCode;
  field: ValidationField;
  productId?: string;
  currency?: string;
}

/**
 * The save rules (FR-035). An empty result means the look may be written.
 * `livePrices` holds today's list prices per piece; `currencies` are the
 * project's currencies.
 */
export function validateLook(
  look: Pick<
    LookInput,
    'label' | 'componentProductIds' | 'setPrice' | 'sum' | 'image'
  >,
  livePrices: Map<string, Money>,
  currencies: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!look.label.de.trim())
    errors.push({ code: 'name-missing', field: 'label.de' });
  if (!look.label.en.trim())
    errors.push({ code: 'name-missing', field: 'label.en' });

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
    for (const currency of currencies) {
      if (livePrices.get(id)?.[currency] === undefined) {
        errors.push({
          code: 'piece-price-missing',
          field: 'pieces',
          productId: id,
          currency,
        });
      }
    }
  }

  const liveSum = sumListPrices(ids, livePrices, currencies);
  for (const currency of currencies) {
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
    if (sum === undefined) continue; // reported per piece above
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
