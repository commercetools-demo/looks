/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/**
 * `sortOrder` range reserved for looks created by the app: `0.7` to
 * `0.7999` in steps of `0.0001`, written without trailing zeros (`0.7`,
 * `0.7001`, ..., `0.701`): the API rejects a `sortOrder` that ends with a zero
 * such as `0.7000`. Each country discount of a look takes its own rank.
 */
export const SORT_ORDER_FIRST = '0.7';
export const SORT_ORDER_LAST = '0.7999';

const FIRST = 7000;
const LAST = 7999;

export class SortOrderExhaustedError extends Error {
  constructor() {
    super(
      `No free Cart Discount sortOrder left between ${SORT_ORDER_FIRST} and ${SORT_ORDER_LAST}.`
    );
    this.name = 'SortOrderExhaustedError';
  }
}

/** Ten-thousandths of a `sortOrder`, or `undefined` when it is not an exact
 *  multiple of `0.0001` (`0.7` and `0.7000` are the same value). */
function toUnits(sortOrder: string): number | undefined {
  const value = Number(sortOrder);
  if (!Number.isFinite(value)) return undefined;
  const units = Math.round(value * 10000);
  return Math.abs(units - value * 10000) < 1e-6 ? units : undefined;
}

/** `0.<u>` without trailing zeros: 7000 to `0.7`, 7100 to `0.71`, 7001 to `0.7001`. */
function format(units: number): string {
  return `0.${String(units).padStart(4, '0').replace(/0+$/, '')}`;
}

/** The `count` lowest free values of the app range, given every Cart
 *  Discount's current `sortOrder` (compared as numbers). */
export function nextSortOrders(existing: string[], count: number): string[] {
  const taken = new Set<number>();
  for (const sortOrder of existing) {
    const t = toUnits(sortOrder);
    if (t !== undefined) taken.add(t);
  }
  const free: string[] = [];
  for (let t = FIRST; t <= LAST && free.length < count; t += 1) {
    if (!taken.has(t)) free.push(format(t));
  }
  if (free.length < count) throw new SortOrderExhaustedError();
  return free;
}

/** The lowest free value of the app range. */
export const nextSortOrder = (existing: string[]): string =>
  nextSortOrders(existing, 1)[0];
