import { buildLookDiscountGroupDraft } from './look-actions';
import type { LookApi } from './look-api';
import { nextSortOrder } from './sort-order';
import type { LookDiscountGroup, LocalizedValue } from './types';
import { lookObjectKey } from './keys';

/**
 * The look's Discount Group (key `look-<key>`): the existing one, or a new
 * one with the lowest free rank. A rank is unique among all Cart Discounts
 * and Discount Groups, so both are read. `isActive` is only used when the
 * group is created.
 */
export async function ensureLookGroup(
  api: LookApi,
  look: { key: string; label: LocalizedValue },
  isActive: boolean
): Promise<LookDiscountGroup> {
  const existing = await api.getDiscountGroupByKey(lookObjectKey(look.key));
  if (existing) return existing;
  const [discounts, groups] = await Promise.all([
    api.fetchCartDiscounts(),
    api.fetchDiscountGroups(),
  ]);
  const sortOrder = nextSortOrder([
    ...discounts.map((discount) => discount.sortOrder),
    ...groups.map((group) => group.sortOrder),
  ]);
  return api.createDiscountGroup(
    buildLookDiscountGroupDraft(look, { sortOrder, isActive })
  );
}
