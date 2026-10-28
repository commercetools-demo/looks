/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { lookKeyFromDiscountKey, lookObjectKey } from '../domain/keys';
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
  /** The main discount and the country discounts of the look. */
  discounts: LookDiscount[];
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
      const [object, all] = await Promise.all([
        api.getLookObject(key),
        api.fetchCartDiscounts(),
      ]);
      const discounts = all.filter(
        (candidate) => lookKeyFromDiscountKey(candidate.key) === lookKey
      );
      const main = discounts.find((candidate) => candidate.key === key);
      const ids = object?.value.componentProductIds ?? main?.pieceIds ?? [];
      const pieces =
        ids.length > 0 ? await api.fetchPieces(ids) : new Map<string, Piece>();
      if (!cancelled)
        setSource({ status: 'ready', data: { object, discounts, pieces } });
    })().catch((error: unknown) => {
      if (!cancelled) setSource({ status: 'error', error });
    });
    return () => {
      cancelled = true;
    };
  }, [api, lookKey, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const apply = useCallback(
    (
      discount?: LookDiscount,
      object?: LookObject,
      more: LookDiscount[] = []
    ) => {
      const written = discount ? [discount, ...more] : more;
      setSource((current) => {
        if (current.status !== 'ready') return current;
        const known = current.data.discounts;
        const replaced = known.map(
          (d) => written.find((w) => w.id === d.id) ?? d
        );
        const added = written.filter((w) => !known.some((d) => d.id === w.id));
        return {
          status: 'ready',
          data: {
            ...current.data,
            discounts: [...replaced, ...added],
            ...(object ? { object } : {}),
          },
        };
      });
    },
    []
  );

  const state = useMemo<LookDetailState>(() => {
    if (source.status !== 'ready') return source;
    const { object, discounts, pieces } = source.data;
    if (!object && discounts.length === 0) return { status: 'not-found' };
    const [row] = buildLookRows({
      objects: object ? [object] : [],
      discounts,
      pieces,
      currencies,
    });
    return row ? { status: 'ready', row } : { status: 'not-found' };
  }, [source, currencies]);

  return { state, reload, apply };
}
