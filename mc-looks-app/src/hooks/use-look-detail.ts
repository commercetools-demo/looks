import { useCallback, useEffect, useMemo, useState } from 'react';
import { lookObjectKey } from '../domain/keys';
import { buildLookRows, type LookRow } from '../domain/look-rows';
import type { LookDiscount, LookObject, Piece } from '../domain/types';
import { useCurrencies, useLookApi } from './context';

export type LookDetailState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; row: LookRow };

interface Loaded {
  object?: LookObject;
  discount?: LookDiscount;
  pieces: Map<string, Piece>;
}

type Source =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: Loaded };

/**
 * One look by its key: its object, its same-key discount and its pieces,
 * joined into a `LookRow`. `apply` puts a freshly written discount or object
 * into the row without reading again; `reload` reads everything again.
 */
export function useLookDetail(lookKey: string) {
  const api = useLookApi();
  const currencies = useCurrencies();
  const [source, setSource] = useState<Source>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSource({ status: 'loading' });
    (async () => {
      const key = lookObjectKey(lookKey);
      const [object, discount] = await Promise.all([
        api.getLookObject(key),
        api.getCartDiscountByKey(key),
      ]);
      const ids = object?.value.componentProductIds ?? discount?.pieceIds ?? [];
      const pieces =
        ids.length > 0 ? await api.fetchPieces(ids) : new Map<string, Piece>();
      if (!cancelled)
        setSource({ status: 'ready', data: { object, discount, pieces } });
    })().catch((error: unknown) => {
      if (!cancelled) setSource({ status: 'error', error });
    });
    return () => {
      cancelled = true;
    };
  }, [api, lookKey, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const apply = useCallback((discount?: LookDiscount, object?: LookObject) => {
    setSource((current) =>
      current.status === 'ready'
        ? {
            status: 'ready',
            data: {
              ...current.data,
              ...(discount ? { discount } : {}),
              ...(object ? { object } : {}),
            },
          }
        : current
    );
  }, []);

  const state = useMemo<LookDetailState>(() => {
    if (source.status !== 'ready') return source;
    const { object, discount, pieces } = source.data;
    if (!object && !discount) return { status: 'not-found' };
    const [row] = buildLookRows({
      objects: object ? [object] : [],
      discounts: discount ? [discount] : [],
      pieces,
      currencies,
    });
    return row ? { status: 'ready', row } : { status: 'not-found' };
  }, [source, currencies]);

  return { state, reload, apply };
}
