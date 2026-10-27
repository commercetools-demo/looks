import { buildLookDescription, buildLookDiscountName } from './names';
import { lookDiscountKey, lookObjectKey } from './keys';
import { splitPriceKey } from './prices';
import type { LookInput, Money } from './types';

/** `LocalizedStringItemInputType[]` of the GraphQL API. */
export const toLocalizedInput = (value: Record<string, string>) =>
  Object.entries(value)
    .filter(([, text]) => text)
    .map(([locale, text]) => ({ locale, value: text }));

const toMoneyInput = (money: Money) =>
  Object.entries(money).map(([currencyCode, centAmount]) => ({
    currencyCode,
    centAmount,
  }));

/** The cells of one country: one Cart Discount covers them all. */
export interface DiscountGroup {
  /** `''` for prices without a country. */
  country: string;
  keys: string[];
}

/** Groups price cells by country, in the order the countries first appear;
 *  the first group is the look's main discount. */
export function groupPriceKeys(keys: string[]): DiscountGroup[] {
  const groups: DiscountGroup[] = [];
  for (const key of keys) {
    const { country } = splitPriceKey(key);
    const group = groups.find((entry) => entry.country === country);
    if (group) group.keys.push(key);
    else groups.push({ country, keys: [key] });
  }
  return groups;
}

/** The discount amount per currency of a group: live sum minus set price. */
export function groupAmounts(
  group: DiscountGroup,
  sum: Money,
  setPrice: Money
): Money {
  const amounts: Money = {};
  for (const key of group.keys) {
    amounts[splitPriceKey(key).currency] = (sum[key] ?? 0) - setPrice[key];
  }
  return amounts;
}

/** The cart condition of a country discount. */
export const countryPredicate = (country: string): string =>
  country ? `country = "${country}"` : 'country is not defined';

/**
 * The value input: an absolute amount distributed proportionately over the
 * matched lines (the input that carries the application mode; see
 * contracts/discount-shape.md and research R14).
 */
export function buildDiscountValueInput(amounts: Money) {
  return {
    absoluteCart: {
      money: toMoneyInput(amounts),
      applicationMode: 'ProportionateDistribution' as const,
    },
  };
}

/** Pattern target: one unit of each piece, once per complete set. */
export function buildPatternTargetInput(componentProductIds: string[]) {
  return {
    pattern: {
      triggerPattern: [] as never[],
      targetPattern: componentProductIds.map((id) => ({
        CountOnLineItemUnits: {
          predicate: `product.id = "${id}"`,
          minCount: 1,
          maxCount: 1,
        },
      })),
      selectionMode: 'Cheapest' as const,
    },
  };
}

/** The Discount Group of a look: all its country discounts live in it, so
 *  one rank (`sortOrder`) and one switch (`isActive`) cover them. */
export function buildLookDiscountGroupDraft(
  look: Pick<LookInput, 'key' | 'label'>,
  options: { sortOrder: string; isActive: boolean }
) {
  return {
    key: lookObjectKey(look.key),
    sortOrder: options.sortOrder,
    name: toLocalizedInput(buildLookDiscountName(look.label)),
    isActive: options.isActive,
  };
}

export const setGroupActiveAction = (isActive: boolean) => ({
  setIsActive: { isActive },
});

/** The Cart Discount draft of one country group (contracts/discount-shape.md);
 *  the main discount is keyed `look-<key>`, the others `look-<key>-<country>`.
 *  It belongs to the look's Discount Group and so has no `sortOrder`. */
export function buildCountryDiscountDraft(
  look: LookInput,
  group: DiscountGroup,
  options: { isActive: boolean; isMain: boolean }
) {
  return {
    key: lookDiscountKey(look.key, group.country, options.isMain),
    name: toLocalizedInput(buildLookDiscountName(look.label)),
    description: toLocalizedInput(buildLookDescription(look.label)),
    cartPredicate: countryPredicate(group.country),
    value: buildDiscountValueInput(
      groupAmounts(group, look.sum, look.setPrice)
    ),
    target: buildPatternTargetInput(look.componentProductIds),
    discountGroup: { typeId: 'discount-group', key: lookObjectKey(look.key) },
    stores: [] as never[],
    isActive: options.isActive,
    requiresDiscountCode: false,
  };
}

/**
 * The set-price Cart Discount drafts of a look: one per country with set
 * prices, each applying in carts of that country.
 */
export function buildLookCartDiscountDrafts(
  look: LookInput,
  options: { isActive: boolean }
) {
  return groupPriceKeys(Object.keys(look.setPrice)).map((group, index) =>
    buildCountryDiscountDraft(look, group, {
      isActive: options.isActive,
      isMain: index === 0,
    })
  );
}

export type CartDiscountUpdateActionInput =
  | { changeIsActive: { isActive: boolean } }
  | { changeValue: { value: ReturnType<typeof buildDiscountValueInput> } }
  | { changeName: { name: Array<{ locale: string; value: string }> } }
  | {
      setDescription: { description: Array<{ locale: string; value: string }> };
    };

export const changeIsActiveAction = (
  isActive: boolean
): CartDiscountUpdateActionInput => ({ changeIsActive: { isActive } });

export const changeValueAction = (
  amounts: Money
): CartDiscountUpdateActionInput => ({
  changeValue: { value: buildDiscountValueInput(amounts) },
});

/** Name and description of a discount for a look name. */
export const nameActions = (
  label: Record<string, string>
): CartDiscountUpdateActionInput[] => [
  { changeName: { name: toLocalizedInput(buildLookDiscountName(label)) } },
  {
    setDescription: {
      description: toLocalizedInput(buildLookDescription(label)),
    },
  },
];
