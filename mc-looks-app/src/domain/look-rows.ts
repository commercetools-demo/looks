import {
  isCountryDiscountKey,
  lookKeyFromDiscountKey,
  lookKeyFromObjectKey,
  lookObjectKey,
} from './keys';
import { lookNameFromDiscount } from './names';
import { livePriceMap } from './pieces';
import {
  lookPriceKeys,
  referenceMoney,
  savingPercent,
  splitPriceKey,
  sumListPrices,
} from './prices';
import type {
  LocalizedValue,
  LookDiscount,
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
  /** Set price and live sum per price cell (currency and country, or the currency alone). */
  setPrice?: Money;
  liveSum: Money;
  /** The same per currency (the first country cell of each), for lists. */
  referenceSetPrice?: Money;
  referenceSum: Money;
  /** Saving in percent of the live sum in the first currency. */
  savingPercent?: number;
  /** The discount decides what the shopper pays. */
  isActive: boolean;
  completeness: Completeness;
  /** A discount's amount no longer equals today's live sum minus the stored
   *  set price, or a country has no discount. */
  priceDrift: boolean;
  /** A price cell with a live sum has no set price: cannot be repriced as is. */
  missingCurrency: boolean;
  object?: LookObject;
  /** The main discount `look-<key>`; it decides `isActive`. */
  discount?: LookDiscount;
  /** The country discounts `look-<key>-DE` ... */
  countryDiscounts: LookDiscount[];
}

const samePieces = (a: string[], b: string[]): boolean =>
  a.length > 0 &&
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/** The discount that applies in the country of a price cell. */
export function discountForKey(
  row: Pick<LookRow, 'discount' | 'countryDiscounts'>,
  key: string
): LookDiscount | undefined {
  const { country } = splitPriceKey(key);
  return [row.discount, ...row.countryDiscounts].find(
    (discount) => discount && discount.country === country
  );
}

export function buildLookRows(input: {
  objects: LookObject[];
  discounts: LookDiscount[];
  pieces: Map<string, Piece>;
  currencies: string[];
}): LookRow[] {
  const { currencies } = input;
  const objectsByKey = new Map(input.objects.map((o) => [o.key, o]));
  const mainByKey = new Map<string, LookDiscount>();
  const countriesByLook = new Map<string, LookDiscount[]>();
  for (const discount of input.discounts) {
    const lookKey = lookKeyFromDiscountKey(discount.key);
    if (!lookKey) continue;
    if (isCountryDiscountKey(discount.key)) {
      countriesByLook.set(lookKey, [
        ...(countriesByLook.get(lookKey) ?? []),
        discount,
      ]);
    } else {
      mainByKey.set(discount.key, discount);
    }
  }
  const keys = new Set<string>([
    ...objectsByKey.keys(),
    ...mainByKey.keys(),
    ...[...countriesByLook.keys()].map(lookObjectKey),
  ]);
  const livePrices = livePriceMap(input.pieces.values());

  const rows: LookRow[] = [];
  for (const objectKey of [...keys].sort()) {
    const lookKey = lookKeyFromObjectKey(objectKey);
    if (!lookKey) continue;
    const object = objectsByKey.get(objectKey);
    const discount = mainByKey.get(objectKey);
    const countryDiscounts = countriesByLook.get(lookKey) ?? [];
    const value = object?.value;
    const pieceIds = value?.componentProductIds ?? discount?.pieceIds ?? [];
    const priceKeys = lookPriceKeys(pieceIds, livePrices, currencies);
    const liveSum = sumListPrices(pieceIds, livePrices, priceKeys);
    const setPrice = value?.setPrice;
    const withDiscounts = { discount, countryDiscounts };

    const priceDrift =
      !!discount &&
      !!setPrice &&
      Object.keys(liveSum).some((key) => {
        if (setPrice[key] === undefined) return false;
        const amount = discountForKey(withDiscounts, key)?.amount[
          splitPriceKey(key).currency
        ];
        return amount === undefined || liveSum[key] - amount !== setPrice[key];
      });

    const referenceSum = referenceMoney(liveSum, currencies);
    const referenceSetPrice = setPrice
      ? referenceMoney(setPrice, currencies)
      : undefined;
    const first = currencies[0];

    rows.push({
      id: objectKey,
      lookKey,
      objectKey: lookObjectKey(lookKey),
      name: lookNameFromDiscount(discount ?? countryDiscounts[0]),
      pieceIds,
      pieces: pieceIds.map((id) => input.pieces.get(id)),
      setPrice,
      liveSum,
      referenceSetPrice,
      referenceSum,
      savingPercent: first
        ? savingPercent(referenceSum[first], referenceSetPrice?.[first])
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
        !!setPrice &&
        Object.keys(liveSum).some((key) => setPrice[key] === undefined),
      object,
      discount,
      countryDiscounts,
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
    if (lookKeyFromDiscountKey(discount.key)) {
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
  for (const object of objects) {
    const lookKey = lookKeyFromObjectKey(object.key);
    if (lookKey) taken.add(lookKey);
  }
  for (const discount of discounts) {
    const lookKey = lookKeyFromDiscountKey(discount.key);
    if (lookKey) taken.add(lookKey);
  }
  return taken;
}

/** Complete looks that are switched off: the past looks. */
export const isPastLook = (row: LookRow): boolean =>
  row.completeness === 'complete' && !row.isActive;
