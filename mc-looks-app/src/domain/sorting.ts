import { localized } from './format';
import type { LookRow } from './look-rows';

export type SortKey = 'name' | 'setPrice' | 'sum' | 'saving' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortState = { key: 'name', direction: 'asc' };

/** Sorting by these needs the pieces' live prices (tier 2). */
export const NEEDS_PRICES: SortKey[] = ['sum', 'saving'];

export const lookTitle = (row: LookRow, dataLocale?: string): string =>
  localized(row.name, dataLocale) ?? row.lookKey;

const statusRank = (row: LookRow): number =>
  row.completeness !== 'complete' ? 2 : row.isActive ? 0 : 1;

/** Rows without a value sort last in both directions. */
function compareOptional(
  a: number | undefined,
  b: number | undefined,
  direction: SortDirection
): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return direction === 'asc' ? a - b : b - a;
}

/** Filter by name; the term matches the title in any language. */
export function filterRows(
  rows: LookRow[],
  term: string,
  dataLocale?: string
): LookRow[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    (row) =>
      lookTitle(row, dataLocale).toLowerCase().includes(needle) ||
      Object.values(row.name ?? {}).some((n) =>
        n.toLowerCase().includes(needle)
      )
  );
}

/** Sorted copy; ties fall back to the name, then the key. */
export function sortRows(
  rows: LookRow[],
  sort: SortState,
  currencies: string[],
  dataLocale?: string
): LookRow[] {
  const first = currencies[0];
  const byName = (a: LookRow, b: LookRow) =>
    lookTitle(a, dataLocale).localeCompare(
      lookTitle(b, dataLocale),
      dataLocale
    ) || a.lookKey.localeCompare(b.lookKey);
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let result = 0;
    switch (sort.key) {
      case 'name':
        return sign * byName(a, b);
      case 'setPrice':
        result = compareOptional(
          a.referenceSetPrice?.[first],
          b.referenceSetPrice?.[first],
          sort.direction
        );
        break;
      case 'sum':
        result = compareOptional(
          a.referenceSum[first],
          b.referenceSum[first],
          sort.direction
        );
        break;
      case 'saving':
        result = compareOptional(
          a.savingPercent,
          b.savingPercent,
          sort.direction
        );
        break;
      case 'status':
        result = sign * (statusRank(a) - statusRank(b));
        break;
    }
    return result || byName(a, b);
  });
}
