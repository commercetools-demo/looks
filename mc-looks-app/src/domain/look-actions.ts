import { buildLookDescription, buildLookDiscountName } from './names';
import { lookObjectKey } from './keys';
import type { LookInput, Money } from './types';

/** `LocalizedStringItemInputType[]` of the GraphQL API. */
export const toLocalizedInput = (value: Record<string, string>) =>
  Object.entries(value).map(([locale, text]) => ({ locale, value: text }));

const toMoneyInput = (money: Money) =>
  Object.entries(money).map(([currencyCode, centAmount]) => ({
    currencyCode,
    centAmount,
  }));

/**
 * The discount amount per currency: live sum minus set price. Both must have
 * the same currencies.
 */
export function discountAmounts(sum: Money, setPrice: Money): Money {
  const amounts: Money = {};
  for (const currency of Object.keys(setPrice)) {
    amounts[currency] = (sum[currency] ?? 0) - setPrice[currency];
  }
  return amounts;
}

/**
 * The value input: an absolute amount distributed proportionately over the
 * matched lines (the input that carries the application mode; see
 * contracts/discount-shape.md and research R14).
 */
export function buildDiscountValueInput(sum: Money, setPrice: Money) {
  return {
    absoluteCart: {
      money: toMoneyInput(discountAmounts(sum, setPrice)),
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

/** The set-price Cart Discount draft (contracts/discount-shape.md). */
export function buildLookCartDiscountDraft(
  look: LookInput,
  options: { sortOrder: string; isActive: boolean }
) {
  return {
    key: lookObjectKey(look.key),
    name: toLocalizedInput(buildLookDiscountName(look.label)),
    description: toLocalizedInput(buildLookDescription(look.label)),
    cartPredicate: 'true',
    value: buildDiscountValueInput(look.sum, look.setPrice),
    target: buildPatternTargetInput(look.componentProductIds),
    sortOrder: options.sortOrder,
    stores: [] as never[],
    isActive: options.isActive,
    requiresDiscountCode: false,
  };
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
  sum: Money,
  setPrice: Money
): CartDiscountUpdateActionInput => ({
  changeValue: { value: buildDiscountValueInput(sum, setPrice) },
});

/** Name and description of a discount for a look name. */
export const nameActions = (label: {
  de: string;
  en: string;
}): CartDiscountUpdateActionInput[] => [
  { changeName: { name: toLocalizedInput(buildLookDiscountName(label)) } },
  {
    setDescription: {
      description: toLocalizedInput(buildLookDescription(label)),
    },
  },
];
