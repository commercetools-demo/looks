import { lookKeyFromObjectKey, lookObjectKey } from './keys';
import { lookNameFromDiscount } from './names';
import { livePriceMap } from './pieces';
import { savingPercent, sumListPrices } from './prices';
import type {
  LocalizedValue,
  LookDiscount,
  LookImage,
  LookObject,
  Money,
  Piece,
} from './types';

/** `complete`: object and discount exist and name the same pieces. Only a
 *  complete look can be switched; the others show "Unvollständig". */
export type Completeness =
  | 'complete'
  | 'missing-discount'
  | 'missing-object'
  | 'inconsistent';

/** One row of the looks list: an object joined with its same-key discount. */
export interface LookRow {
  id: string;
  lookKey: string;
  objectKey: string;
  /** The look name per language (discount `name`, else `description`). */
  name?: LocalizedValue;
  pieceIds: string[];
  /** `undefined` entries are pieces whose data is not loaded (yet). */
  pieces: Array<Piece | undefined>;
  image?: LookImage;
  setPrice?: Money;
  liveSum: Money;
  discountAmount: Money;
  /** Saving in percent of the live sum in the first currency. */
  savingPercent?: number;
  /** The discount decides what the shopper pays. */
  isActive: boolean;
  completeness: Completeness;
  /** Live sum minus discount amount no longer equals the stored set price. */
  priceDrift: boolean;
  /** A project currency has no set price: cannot be repriced as is. */
  missingCurrency: boolean;
  object?: LookObject;
  discount?: LookDiscount;
}

const samePieces = (a: string[], b: string[]): boolean =>
  a.length > 0 &&
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export function buildLookRows(input: {
  objects: LookObject[];
  discounts: LookDiscount[];
  pieces: Map<string, Piece>;
  currencies: string[];
}): LookRow[] {
  const { currencies } = input;
  const objectsByKey = new Map(input.objects.map((o) => [o.key, o]));
  const discountsByKey = new Map(
    input.discounts
      .filter((d) => lookKeyFromObjectKey(d.key))
      .map((d) => [d.key, d])
  );
  const keys = new Set<string>([
    ...objectsByKey.keys(),
    ...discountsByKey.keys(),
  ]);
  const livePrices = livePriceMap(input.pieces.values());

  const rows: LookRow[] = [];
  for (const objectKey of [...keys].sort()) {
    const lookKey = lookKeyFromObjectKey(objectKey);
    if (!lookKey) continue;
    const object = objectsByKey.get(objectKey);
    const discount = discountsByKey.get(objectKey);
    const value = object?.value;
    const pieceIds = value?.componentProductIds ?? discount?.pieceIds ?? [];
    const liveSum = sumListPrices(pieceIds, livePrices, currencies);
    const amount = discount?.amount ?? {};
    const setPrice = value?.setPrice;
    const first = currencies[0];

    const priceDrift =
      !!discount &&
      !!setPrice &&
      currencies.every(
        (c) =>
          liveSum[c] !== undefined &&
          amount[c] !== undefined &&
          setPrice[c] !== undefined
      ) &&
      currencies.some((c) => liveSum[c] - amount[c] !== setPrice[c]);

    rows.push({
      id: objectKey,
      lookKey,
      objectKey: lookObjectKey(lookKey),
      name: lookNameFromDiscount(discount),
      pieceIds,
      pieces: pieceIds.map((id) => input.pieces.get(id)),
      ...(value?.image ? { image: value.image } : {}),
      setPrice,
      liveSum,
      discountAmount: amount,
      savingPercent: first
        ? savingPercent(liveSum[first], setPrice?.[first])
        : undefined,
      isActive: discount?.isActive ?? false,
      completeness: !discount
        ? 'missing-discount'
        : !object
        ? 'missing-object'
        : samePieces(value?.componentProductIds ?? [], discount.pieceIds)
        ? 'complete'
        : 'inconsistent',
      priceDrift,
      missingCurrency:
        !!setPrice && currencies.some((c) => setPrice[c] === undefined),
      object,
      discount,
    });
  }
  return rows;
}

/** Every product id any look names, for the product reads. */
export function allPieceIds(
  objects: LookObject[],
  discounts: LookDiscount[]
): string[] {
  const ids = new Set<string>();
  for (const object of objects) {
    for (const id of object.value?.componentProductIds ?? []) ids.add(id);
  }
  for (const discount of discounts) {
    if (lookKeyFromObjectKey(discount.key)) {
      for (const id of discount.pieceIds) ids.add(id);
    }
  }
  return [...ids];
}

/** Look keys already in use, from objects and look discounts alike. */
export function takenLookKeys(
  objects: LookObject[],
  discounts: LookDiscount[]
): Set<string> {
  const taken = new Set<string>();
  for (const key of [
    ...objects.map((o) => o.key),
    ...discounts.map((d) => d.key),
  ]) {
    const lookKey = lookKeyFromObjectKey(key);
    if (lookKey) taken.add(lookKey);
  }
  return taken;
}

/** Complete looks that are switched off: the past looks. */
export const isPastLook = (row: LookRow): boolean =>
  row.completeness === 'complete' && !row.isActive;
