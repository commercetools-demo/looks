import { useCallback, useEffect, useState } from 'react';
import { salesWindowStart, type SalesOrder } from '../domain/past-looks';
import { useLookApi } from './context';

export type PastLookSales =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; orders: SalesOrder[]; truncated: boolean };

/** Reads the recent orders for the sales figures, independently of the list;
 *  only when `enabled` (at least one past look exists). */
export function usePastLookSales(enabled: boolean) {
  const api = useLookApi();
  const [state, setState] = useState<PastLookSales>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    api.fetchRecentOrders(salesWindowStart()).then(
      ({ orders, truncated }) => {
        if (!cancelled) setState({ status: 'ready', orders, truncated });
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', error });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [api, enabled, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
