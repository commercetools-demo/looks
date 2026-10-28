import type { LookValue } from './types';

/**
 * The Custom Object value of a look. `endedAt` is left out when absent so
 * values stay minimal. Extra fields of an older object (a former `image`)
 * are not carried over.
 */
export function buildLookValue(look: {
  componentProductIds: string[];
  setPrice: Record<string, number>;
  endedAt?: string;
}): LookValue {
  return {
    componentProductIds: [...look.componentProductIds],
    setPrice: { ...look.setPrice },
    ...(look.endedAt ? { endedAt: look.endedAt } : {}),
  };
}
