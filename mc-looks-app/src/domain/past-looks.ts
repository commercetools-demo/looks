/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { LookRow } from './look-rows';
import { isPastLook } from './look-rows';
import { lookTitle } from './sorting';
import type { LocalizedValue, Money } from './types';

/** Orders newer than this many days are read for the sales figures. */
export const SALES_WINDOW_DAYS = 90;

export interface SalesLine {
  quantity: number;
  discountedPrice: {
    value: { currencyCode: string; centAmount: number };
    includedDiscounts?: ReadonlyArray<{ discountRef: { id: string } }> | null;
  };
}

export interface SalesOrder {
  id: string;
  lineItems?: ReadonlyArray<{
    discountedPricePerQuantity?: ReadonlyArray<SalesLine> | null;
  }> | null;
}

export interface PastLookRow {
  lookKey: string;
  objectKey: string;
  name?: LocalizedValue;
  /** Fallback thumbnails, in the look's order. */
  pieceImageUrls: Array<string | undefined>;
  pieceCount: number;
  /** ISO date: the discount's creation. */
  activeFrom?: string;
  /** ISO date the look was switched off (`endedAt`); never last-modified. */
  activeUntil?: string;
  orders: number;
  setsSold: number;
  revenue: Money;
  discountId: string;
  /** The look's country discounts, switched together with the main one. */
  countryDiscountIds: string[];
}

interface Sales {
  orders: number;
  units: number;
  revenue: Money;
}

/**
 * Per look discount id: the units sold with a portion of that discount and
 * what they were sold for. A line sold as part of a set carries the look's
 * discount in `includedDiscounts`; the look key itself is not on the order.
 */
export function salesByDiscount(
  orders: ReadonlyArray<SalesOrder>,
  discountIds: Set<string>
): Map<string, Sales> {
  const sales = new Map<string, Sales>();
  for (const order of orders) {
    const seenInOrder = new Set<string>();
    for (const line of order.lineItems ?? []) {
      for (const entry of line.discountedPricePerQuantity ?? []) {
        const currency = entry.discountedPrice.value.currencyCode;
        for (const { discountRef: discount } of entry.discountedPrice
          .includedDiscounts ?? []) {
          if (!discountIds.has(discount.id)) continue;
          const bucket = sales.get(discount.id) ?? {
            orders: 0,
            units: 0,
            revenue: {},
          };
          bucket.units += entry.quantity;
          bucket.revenue[currency] =
            (bucket.revenue[currency] ?? 0) +
            entry.quantity * entry.discountedPrice.value.centAmount;
          if (!seenInOrder.has(discount.id)) {
            seenInOrder.add(discount.id);
            bucket.orders += 1;
          }
          sales.set(discount.id, bucket);
        }
      }
    }
  }
  return sales;
}

export const endedAtOf = (row: Pick<LookRow, 'object'>): string | undefined => {
  const endedAt = row.object?.value.endedAt;
  return typeof endedAt === 'string' && endedAt.length > 0
    ? endedAt
    : undefined;
};

/** The section's rows, best seller first, then by name. */
export function buildPastLooks(
  rows: LookRow[],
  orders: ReadonlyArray<SalesOrder>,
  dataLocale?: string
): PastLookRow[] {
  const past = rows.filter(isPastLook).filter((row) => row.discount);
  const discountsOf = (row: LookRow) =>
    [row.discount, ...row.countryDiscounts].filter(
      (discount): discount is NonNullable<typeof discount> => !!discount
    );
  const sales = salesByDiscount(
    orders,
    new Set(past.flatMap((row) => discountsOf(row).map((d) => d.id)))
  );
  // A look's sales are those of all its country discounts (an order carries
  // the discount of its cart's country only, so orders do not double count).
  const soldBy = (row: LookRow) => {
    const total: { orders: number; units: number; revenue: Money } = {
      orders: 0,
      units: 0,
      revenue: {},
    };
    for (const discount of discountsOf(row)) {
      const part = sales.get(discount.id);
      if (!part) continue;
      total.orders += part.orders;
      total.units += part.units;
      for (const [currency, cents] of Object.entries(part.revenue)) {
        total.revenue[currency] = (total.revenue[currency] ?? 0) + cents;
      }
    }
    return total;
  };
  return past
    .map((row): { row: LookRow; past: PastLookRow } => {
      const discount = row.discount as NonNullable<LookRow['discount']>;
      const sold = soldBy(row);
      const pieceCount = row.pieceIds.length || 1;
      return {
        row,
        past: {
          lookKey: row.lookKey,
          objectKey: row.objectKey,
          name: row.name,
          pieceImageUrls: row.pieces.map((piece) => piece?.imageUrl),
          pieceCount: row.pieceIds.length,
          activeFrom: discount.createdAt,
          ...(endedAtOf(row) ? { activeUntil: endedAtOf(row) } : {}),
          orders: sold.orders,
          setsSold: Math.floor(sold.units / pieceCount),
          revenue: sold.revenue,
          discountId: discount.id,
          countryDiscountIds: row.countryDiscounts.map((d) => d.id),
        },
      };
    })
    .sort(
      (a, b) =>
        b.past.setsSold - a.past.setsSold ||
        lookTitle(a.row, dataLocale).localeCompare(
          lookTitle(b.row, dataLocale),
          dataLocale
        )
    )
    .map((entry) => entry.past);
}

/** The ISO timestamp the order read starts at. */
export function salesWindowStart(now: Date = new Date()): string {
  return new Date(
    now.getTime() - SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}
