import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { buildLookRows, isPastLook, type LookRow } from '../domain/look-rows';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  paginate,
  type Page,
} from '../domain/paging';
import {
  DEFAULT_SORT,
  NEEDS_PRICES,
  filterRows,
  sortRows,
  type SortDirection,
  type SortKey,
  type SortState,
} from '../domain/sorting';
import type { LookDiscount, LookObject, Piece } from '../domain/types';
import { useCurrencies, useDataLocale, useLookApi } from './context';

export interface ListQuery {
  page: number;
  size: number;
  sort: SortState;
  q: string;
}

const SORT_KEYS: SortKey[] = ['name', 'setPrice', 'sum', 'saving', 'status'];

const positiveInt = (value: string | null): number | undefined => {
  const parsed = Number(value);
  return value !== null && Number.isInteger(parsed) && parsed > 0
    ? parsed
    : undefined;
};

/** The list state kept in the URL; unknown or missing values mean the defaults. */
export function parseListQuery(search: string): ListQuery {
  const params = new URLSearchParams(search);
  const size = positiveInt(params.get('size'));
  const key = params.get('sort') as SortKey | null;
  const direction = params.get('dir');
  return {
    page: positiveInt(params.get('page')) ?? 1,
    size:
      size && (PAGE_SIZES as readonly number[]).includes(size)
        ? size
        : DEFAULT_PAGE_SIZE,
    sort: {
      key: key && SORT_KEYS.includes(key) ? key : DEFAULT_SORT.key,
      direction:
        direction === 'asc' || direction === 'desc'
          ? direction
          : DEFAULT_SORT.direction,
    },
    q: params.get('q') ?? '',
  };
}

/** Writes the list state into `search`, leaving other parameters alone and
 *  omitting values that equal the defaults. */
export function writeListQuery(search: string, query: ListQuery): string {
  const params = new URLSearchParams(search);
  const set = (name: string, value: string | undefined) => {
    if (value === undefined) params.delete(name);
    else params.set(name, value);
  };
  set('page', query.page > 1 ? String(query.page) : undefined);
  set(
    'size',
    query.size !== DEFAULT_PAGE_SIZE ? String(query.size) : undefined
  );
  set('sort', query.sort.key !== DEFAULT_SORT.key ? query.sort.key : undefined);
  set(
    'dir',
    query.sort.direction !== DEFAULT_SORT.direction
      ? query.sort.direction
      : undefined
  );
  set('q', query.q.trim() ? query.q : undefined);
  const text = params.toString();
  return text ? `?${text}` : '';
}

/**
 * The product ids whose data to load now (tier 2): the pieces of the visible
 * page and of the past looks first; every piece when the sort key needs the
 * live prices of all looks.
 */
export function piecesToLoad(input: {
  sortKey: SortKey;
  allRows: LookRow[];
  pageRows: LookRow[];
}): string[] {
  const rows = NEEDS_PRICES.includes(input.sortKey)
    ? input.allRows
    : [...input.pageRows, ...input.allRows.filter(isPastLook)];
  return [...new Set(rows.flatMap((row) => row.pieceIds))];
}

type Tier1 =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; objects: LookObject[]; discounts: LookDiscount[] };

export type OverviewState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; rows: LookRow[] };

/**
 * Loads the looks in two tiers: objects and discounts for every look, then
 * the product data of the pieces that are shown. Filtering, sorting and
 * paging run in memory over all looks; their state lives in the URL.
 */
export function useLooksOverview() {
  const api = useLookApi();
  const currencies = useCurrencies();
  const dataLocale = useDataLocale();
  const history = useHistory();
  const location = useLocation();
  const query = useMemo(
    () => parseListQuery(location.search),
    [location.search]
  );

  const [tier1, setTier1] = useState<Tier1>({ status: 'loading' });
  const [pieces, setPieces] = useState<Map<string, Piece>>(new Map());
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const [generation, setGeneration] = useState(0);
  const requested = useRef(new Set<string>());
  const status = useRef(tier1.status);
  status.current = tier1.status;

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.fetchLookObjects(), api.fetchCartDiscounts()]).then(
      ([objects, discounts]) => {
        if (!cancelled) setTier1({ status: 'ready', objects, discounts });
      },
      (error: unknown) => {
        if (!cancelled) setTier1({ status: 'error', error });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [api, generation]);

  const reload = useCallback(() => {
    // A visible list stays while it is read again; only a failed or
    // loading one starts over, including the product data.
    if (status.current !== 'ready') {
      requested.current = new Set();
      setPieces(new Map());
      setSettled(new Set());
      setTier1({ status: 'loading' });
    }
    setGeneration((value) => value + 1);
  }, []);

  const replaceDiscount = useCallback(
    (
      discount: LookDiscount,
      object?: LookObject,
      more: LookDiscount[] = []
    ) => {
      const written = [discount, ...more];
      setTier1((current) =>
        current.status !== 'ready'
          ? current
          : {
              status: 'ready',
              discounts: current.discounts.map(
                (d) => written.find((w) => w.id === d.id) ?? d
              ),
              objects: object
                ? current.objects.map((o) =>
                    o.key === object.key ? object : o
                  )
                : current.objects,
            }
      );
    },
    []
  );

  const allRows = useMemo(
    () =>
      tier1.status === 'ready'
        ? buildLookRows({
            objects: tier1.objects,
            discounts: tier1.discounts,
            pieces,
            currencies,
          })
        : [],
    [tier1, pieces, currencies]
  );

  const view: Page<LookRow> & { filtered: boolean } = useMemo(() => {
    const main = allRows.filter((row) => !isPastLook(row));
    const filtered = filterRows(main, query.q, dataLocale);
    const sorted = sortRows(filtered, query.sort, currencies, dataLocale);
    return {
      ...paginate(sorted, query.page, query.size),
      filtered: query.q.trim() !== '',
    };
  }, [allRows, query, currencies, dataLocale]);

  const wanted = useMemo(
    () =>
      piecesToLoad({ sortKey: query.sort.key, allRows, pageRows: view.rows }),
    [query.sort.key, allRows, view.rows]
  );
  const wantedKey = wanted.join(',');
  const pricesLoading =
    tier1.status === 'ready' && wanted.some((id) => !settled.has(id));

  useEffect(() => {
    const missing = (wantedKey ? wantedKey.split(',') : []).filter(
      (id) => !requested.current.has(id)
    );
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    const settle = (found: Map<string, Piece>) => {
      setPieces((current) => new Map([...current, ...found]));
      setSettled((current) => new Set([...current, ...missing]));
    };
    api.fetchPieces(missing).then(settle, () => settle(new Map()));
  }, [api, wantedKey]);

  const update = useCallback(
    (next: ListQuery, mode: 'push' | 'replace' = 'replace') => {
      history[mode]({
        pathname: location.pathname,
        search: writeListQuery(location.search, next),
        state: location.state,
      });
    },
    [history, location.pathname, location.search, location.state]
  );

  const state: OverviewState =
    tier1.status === 'ready' ? { status: 'ready', rows: allRows } : tier1;

  return {
    state,
    reload,
    replaceDiscount,
    pricesLoading,
    query,
    view,
    setSearch: (q: string) => update({ ...query, q, page: 1 }),
    setSort: (key: SortKey, direction: SortDirection) =>
      update({ ...query, sort: { key, direction }, page: 1 }),
    setPage: (page: number) => update({ ...query, page }),
    setPageSize: (size: number) => update({ ...query, size, page: 1 }),
  };
}
