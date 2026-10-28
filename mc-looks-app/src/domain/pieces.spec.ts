/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { resolveConfig } from '../config';
import {
  livePriceMap,
  pieceFromProduct,
  toPiece,
  type RawProduct,
  type RawVariant,
} from './pieces';

const cfg = resolveConfig();

const variant = (
  sku: string,
  size: string | undefined,
  qty: number | null,
  extra: Partial<RawVariant> = {}
): RawVariant => ({
  sku,
  images: [],
  prices: [
    { value: { currencyCode: 'EUR', centAmount: 9999 } },
    { value: { currencyCode: 'CHF', centAmount: 10990 } },
  ],
  attributesRaw: [...(size ? [{ name: 'size', value: size }] : [])],
  availability: qty === null ? null : { noChannel: { availableQuantity: qty } },
  ...extra,
});

const product = (
  master: RawVariant,
  variants: RawVariant[] = []
): RawProduct => ({
  id: 'p1',
  masterData: {
    current: { name: 'Jacke Jacozy', masterVariant: master, variants },
  },
});

describe('pieceFromProduct', () => {
  it('lists sizes from variants with default inventory', () => {
    const piece = pieceFromProduct(
      product(
        variant('a-34', '34', 5, { images: [{ url: 'http://i/1.jpg' }] }),
        [variant('a-36', '36', 0)]
      ),
      cfg,
      'de'
    );
    expect(piece.sizes).toEqual([
      { sku: 'a-34', label: '34', availableQuantity: 5 },
      { sku: 'a-36', label: '36', availableQuantity: 0 },
    ]);
    expect(piece.oneSize).toBe(false);
    expect(piece.soldOutEverywhere).toBe(false);
    expect(piece.imageUrl).toBe('http://i/1.jpg');
  });

  it('does not list a ghost colour group without inventory entries (no size appears twice)', () => {
    const piece = pieceFromProduct(
      product(variant('ghost-34', '34', null), [
        variant('a-34', '34', 3, { images: [{ url: 'http://i/2.jpg' }] }),
      ]),
      cfg
    );
    expect(piece.sizes).toHaveLength(1);
    expect(piece.sizes[0].sku).toBe('a-34');
    expect(piece.imageUrl).toBe('http://i/2.jpg');
  });

  it('lists all variants as sold out when none has an inventory entry', () => {
    const piece = pieceFromProduct(
      product(variant('a-34', '34', null), [variant('a-36', '36', null)]),
      cfg
    );
    expect(piece.sizes.map((s) => s.availableQuantity)).toEqual([0, 0]);
    expect(piece.soldOutEverywhere).toBe(true);
  });

  it('flags a piece without a size attribute as one size', () => {
    const piece = pieceFromProduct(product(variant('bag', undefined, 4)), cfg);
    expect(piece.oneSize).toBe(true);
    expect(piece.sizes).toEqual([
      { sku: 'bag', label: '', availableQuantity: 4 },
    ]);
  });

  it('marks a piece sold out everywhere', () => {
    const piece = pieceFromProduct(
      product(variant('a-34', '34', 0), [variant('a-36', '36', 0)]),
      cfg
    );
    expect(piece.soldOutEverywhere).toBe(true);
  });

  it('reads the variant label from a configured attribute name and enum labels', () => {
    const v = variant('a', undefined, 2, {
      attributesRaw: [{ name: 'groesse', value: { key: 'm', label: 'M' } }],
    });
    const piece = pieceFromProduct(
      product(v),
      resolveConfig({ variantAttributes: 'groesse' })
    );
    expect(piece.sizes[0].label).toBe('M');
    expect(piece.oneSize).toBe(false);
  });
});

describe('products with several variant attributes (pillow cover)', () => {
  const pillowCfg = resolveConfig({
    variantAttributes: 'searchColor, finishColor, size',
  });
  const pillow = (
    sku: string,
    attributes: Array<{ name: string; value: unknown }>,
    qty: number | null = 3
  ): RawVariant => ({
    sku,
    images: [],
    prices: [],
    attributesRaw: attributes,
    availability:
      qty === null ? null : { noChannel: { availableQuantity: qty } },
  });

  it('labels two variants by search colour, finish colour and size, in the configured order', () => {
    const piece = pieceFromProduct(
      product(
        pillow('maya-1', [
          { name: 'searchColor', value: { key: 'beige', label: 'Beige' } },
          {
            name: 'finishColor',
            value: { key: 'linen', label: { de: 'Leinen', en: 'Linen' } },
          },
          { name: 'size', value: '45x45' },
        ]),
        [
          pillow('maya-2', [
            { name: 'size', value: '50x50' },
            { name: 'finishColor', value: 'Natural' },
            { name: 'searchColor', value: 'Grey' },
          ]),
        ]
      ),
      pillowCfg,
      'en'
    );
    expect(piece.oneSize).toBe(false);
    expect(piece.sizes.map((size) => size.label)).toEqual([
      'Beige / Linen / 45x45',
      'Grey / Natural / 50x50',
    ]);
    expect(piece.sizes.map((size) => size.sku)).toEqual(['maya-1', 'maya-2']);
  });

  it('skips attributes a variant does not have and reads numbers and sets', () => {
    const piece = pieceFromProduct(
      product(pillow('a', [{ name: 'size', value: 18 }]), [
        pillow('b', [
          {
            name: 'finishColor',
            value: ['Linen', { key: 'x', label: 'Stone' }],
          },
          { name: 'size', value: 20 },
        ]),
      ]),
      pillowCfg
    );
    expect(piece.sizes.map((size) => size.label)).toEqual([
      '18',
      'Linen, Stone / 20',
    ]);
  });

  it('is not one size: several variants without any configured attribute are listed by SKU', () => {
    const piece = pieceFromProduct(
      product(pillow('maya-1', []), [pillow('maya-2', [])]),
      pillowCfg
    );
    expect(piece.oneSize).toBe(false);
    expect(piece.sizes.map((size) => size.label)).toEqual(['maya-1', 'maya-2']);
  });

  it('is one size only for a single variant without a configured attribute', () => {
    const piece = pieceFromProduct(product(pillow('maya-1', [])), pillowCfg);
    expect(piece.oneSize).toBe(true);
  });

  it('lists both variants when neither has an inventory entry, as sold out', () => {
    const piece = pieceFromProduct(
      product(pillow('maya-1', [{ name: 'size', value: 'S' }], null), [
        pillow('maya-2', [{ name: 'size', value: 'M' }], null),
      ]),
      pillowCfg
    );
    expect(
      piece.sizes.map((size) => [size.label, size.availableQuantity])
    ).toEqual([
      ['S', 0],
      ['M', 0],
    ]);
    expect(piece.soldOutEverywhere).toBe(true);
  });
});

describe('toPiece and livePriceMap', () => {
  it('adds prices for the given currencies from the master variant', () => {
    const piece = toPiece(product(variant('a', '34', 1)), cfg, [
      'EUR',
      'CHF',
      'USD',
    ]);
    expect(piece.prices).toEqual({ EUR: 9999, CHF: 10990 });
    expect(livePriceMap([piece]).get('p1')).toEqual({ EUR: 9999, CHF: 10990 });
  });
});

describe('prices across variants and diagnostics', () => {
  const noPrice = (sku: string) => variant(sku, '34', 1, { prices: [] });

  it('takes the price from another variant when the master variant has none', () => {
    const piece = toPiece(
      product(noPrice('a-34'), [variant('a-36', '36', 1)]),
      cfg,
      ['EUR', 'CHF']
    );
    expect(piece.prices).toEqual({ EUR: 9999, CHF: 10990 });
  });

  it('prefers the master variant per currency', () => {
    const master = variant('a-34', '34', 1, {
      prices: [{ value: { currencyCode: 'EUR', centAmount: 100 } }],
    });
    const piece = toPiece(product(master, [variant('a-36', '36', 1)]), cfg, [
      'EUR',
      'CHF',
    ]);
    expect(piece.prices).toEqual({ EUR: 100, CHF: 10990 });
  });

  it('keeps country prices per currency and country cell', () => {
    const v = variant('a', '34', 1, {
      prices: [
        { value: { currencyCode: 'EUR', centAmount: 1500 }, country: 'DE' },
        { value: { currencyCode: 'GBP', centAmount: 1300 }, country: 'GB' },
      ],
    });
    expect(toPiece(product(v), cfg, ['EUR', 'GBP', 'USD']).prices).toEqual({
      'EUR/DE': 1500,
      'GBP/GB': 1300,
    });
  });

  it('reads the project example: EUR per country, GBP without customer-group and expired prices', () => {
    const gb = (centAmount: number, extra = {}) => ({
      value: { currencyCode: 'GBP', centAmount },
      country: 'GB',
      ...extra,
    });
    const master = variant('a-34', '34', 1, {
      prices: [
        { value: { currencyCode: 'EUR', centAmount: 3299 }, country: 'DE' },
        { value: { currencyCode: 'EUR', centAmount: 2639 }, country: 'FR' },
        gb(3000, { customerGroupRef: { id: 'g' } }),
        gb(2899, {
          validFrom: '2025-09-29T13:55:00.000Z',
          validUntil: '2025-09-29T14:00:00.000Z',
        }),
        gb(3199),
      ],
    });
    const piece = toPiece(product(master), cfg, ['EUR', 'GBP']);
    expect(piece.prices).toEqual({
      'EUR/DE': 3299,
      'EUR/FR': 2639,
      'GBP/GB': 3199,
    });
    expect(livePriceMap([piece]).get('p1')).toEqual(piece.prices);
  });

  it('uses no price restricted to a customer group or channel', () => {
    const master = variant('a-34', '34', 1, {
      prices: [
        {
          value: { currencyCode: 'EUR', centAmount: 100 },
          customerGroupRef: { id: 'g' },
        },
        {
          value: { currencyCode: 'USD', centAmount: 300 },
          channelRef: { id: 'c' },
        },
      ],
    });
    expect(toPiece(product(master), cfg, ['EUR', 'USD']).prices).toEqual({});
  });
});

describe('A pillow cover with colour variants and country prices', () => {
  const cfg = resolveConfig({
    variantAttributes: 'search-color,search-finish,size',
  });
  const variant = (sku: string, key: string, de: string, quantity: number) => ({
    sku,
    prices: [
      { value: { currencyCode: 'EUR', centAmount: 899 }, country: 'DE' },
      { value: { currencyCode: 'EUR', centAmount: 719 }, country: 'FR' },
    ],
    attributesRaw: [
      {
        name: 'search-color',
        value: { key, label: { 'en-US': key, 'de-DE': de } },
      },
    ],
    availability: { noChannel: { availableQuantity: quantity } },
  });

  it('lists both colour variants, labelled in the data locale', () => {
    const piece = pieceFromProduct(
      {
        id: 'maya',
        masterData: {
          current: {
            name: 'Maya-Kissenbezug',
            masterVariant: variant('MPC-02', 'purple', 'Violett', 98),
            variants: [variant('MPC-07', 'yellow', 'Gelb', 100)],
          },
        },
      },
      cfg,
      'de-DE'
    );
    expect(piece.oneSize).toBe(false);
    expect(piece.sizes.map((size) => size.label)).toEqual(['Violett', 'Gelb']);
  });
});
