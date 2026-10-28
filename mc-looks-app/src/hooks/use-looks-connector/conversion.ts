/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

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
  cartPredicate?: string | null;
  value?: {
    type?: string;
    money?: RawMoney[] | null;
    permyriad?: number | null;
  } | null;
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

const COUNTRY_PREDICATE = /^country\s*=\s*"([A-Z]{2})"$/;

/** The country a discount applies in: `country = "DE"` is DE, `true` and
 *  `country is not defined` mean no country; any other condition is not one
 *  the app wrote (`undefined`). */
export function countryOfPredicate(
  predicate: string | null | undefined
): string | undefined {
  const text = (predicate ?? 'true').trim();
  if (text === 'true' || text === 'country is not defined') return '';
  return COUNTRY_PREDICATE.exec(text)?.[1];
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
    ...(typeof raw.value?.permyriad === 'number'
      ? { permyriad: raw.value.permyriad }
      : {}),
    country: countryOfPredicate(raw.cartPredicate),
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
