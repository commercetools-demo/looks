import { toLocalizedRecord } from '../../domain/format';
import type { LookDiscount, LookObject, LookValue } from '../../domain/types';

export interface RawMoney {
  currencyCode: string;
  centAmount: number;
}

export interface RawLookDiscount {
  id: string;
  version: number;
  key?: string | null;
  isActive: boolean;
  sortOrder: string;
  createdAt: string;
  nameAllLocales?: Array<{ locale: string; value: string }> | null;
  descriptionAllLocales?: Array<{ locale: string; value: string }> | null;
  value?: { type?: string; money?: RawMoney[] | null } | null;
  target?: {
    type?: string;
    targetPattern?: Array<{ predicate?: string | null }> | null;
  } | null;
}

export interface RawLookObject {
  id: string;
  version: number;
  key: string;
  value: unknown;
}

const PRODUCT_ID = /product\.id\s*=\s*"([^"]+)"/;

/** The product ids a pattern target names, in order. */
export function patternProductIds(target: RawLookDiscount['target']): string[] {
  if (!target || target.type !== 'pattern') return [];
  const ids: string[] = [];
  for (const component of target.targetPattern ?? []) {
    const match = component?.predicate
      ? PRODUCT_ID.exec(component.predicate)
      : null;
    if (match) ids.push(match[1]);
  }
  return ids;
}

export function toLookDiscount(raw: RawLookDiscount): LookDiscount {
  const amount: Record<string, number> = {};
  for (const money of raw.value?.money ?? []) {
    amount[money.currencyCode] = money.centAmount;
  }
  return {
    id: raw.id,
    version: raw.version,
    key: raw.key ?? '',
    isActive: raw.isActive,
    sortOrder: raw.sortOrder,
    createdAt: raw.createdAt,
    name: toLocalizedRecord(raw.nameAllLocales),
    description: toLocalizedRecord(raw.descriptionAllLocales),
    amount,
    pieceIds: patternProductIds(raw.target),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A Custom Object whose value is not a look definition is dropped. */
export function toLookObject(raw: RawLookObject): LookObject | undefined {
  const value = raw.value;
  if (
    !isRecord(value) ||
    !Array.isArray(value.componentProductIds) ||
    !isRecord(value.setPrice)
  ) {
    return undefined;
  }
  return {
    id: raw.id,
    version: raw.version,
    key: raw.key,
    value: value as unknown as LookValue,
  };
}
