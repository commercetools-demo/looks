/**
 * `sortOrder` range reserved for looks created by the app: `0.7` to `0.799`
 * in steps of `0.001`, written without trailing zeros (`0.7`, `0.701`, ...,
 * `0.71`): the API rejects a `sortOrder` that ends with a zero such as
 * `0.700`.
 */
export const SORT_ORDER_FIRST = '0.7';
export const SORT_ORDER_LAST = '0.799';

const FIRST = 700;
const LAST = 799;

export class SortOrderExhaustedError extends Error {
  constructor() {
    super(
      `No free Cart Discount sortOrder left between ${SORT_ORDER_FIRST} and ${SORT_ORDER_LAST}.`
    );
    this.name = 'SortOrderExhaustedError';
  }
}

/** Thousandths of a `sortOrder`, or `undefined` when it is not an exact
 *  multiple of `0.001` (`0.7` and `0.700` are the same value). */
function toThousandths(sortOrder: string): number | undefined {
  const value = Number(sortOrder);
  if (!Number.isFinite(value)) return undefined;
  const thousandths = Math.round(value * 1000);
  return Math.abs(thousandths - value * 1000) < 1e-6 ? thousandths : undefined;
}

/** `0.<t>` without trailing zeros: 700 to `0.7`, 710 to `0.71`, 701 to `0.701`. */
function format(thousandths: number): string {
  return `0.${String(thousandths).padStart(3, '0').replace(/0+$/, '')}`;
}

/** The lowest free value of the app range, given every Cart Discount's
 *  current `sortOrder` (compared as numbers). */
export function nextSortOrder(existing: string[]): string {
  const taken = new Set<number>();
  for (const sortOrder of existing) {
    const t = toThousandths(sortOrder);
    if (t !== undefined) taken.add(t);
  }
  for (let t = FIRST; t <= LAST; t += 1) {
    if (!taken.has(t)) return format(t);
  }
  throw new SortOrderExhaustedError();
}
