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
  attributesRaw: [
    ...(size ? [{ name: 'size', value: size }] : []),
    {
      name: 'color-name',
      value: { de: 'natürliche Glasur', en: 'natural glaze' },
    },
  ],
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
  it('lists sizes from variants with default inventory and the colour name in the data locale', () => {
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
    expect(piece.colour).toBe('natürliche Glasur');
    expect(piece.oneSize).toBe(false);
    expect(piece.soldOutEverywhere).toBe(false);
    expect(piece.imageUrl).toBe('http://i/1.jpg');
    expect(
      pieceFromProduct(product(variant('a-34', '34', 5)), cfg, 'en').colour
    ).toBe('natural glaze');
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

  it('falls back to the colour attribute label when there is no colour name', () => {
    const v = variant('a-34', '34', 1, {
      attributesRaw: [
        { name: 'size', value: '34' },
        {
          name: 'color',
          value: { key: 'beige', label: { de: 'Beige', en: 'Beige' } },
        },
      ],
    });
    expect(pieceFromProduct(product(v), cfg, 'de').colour).toBe('Beige');
  });

  it('reads sizes from a configured attribute name and enum labels', () => {
    const v = variant('a', undefined, 2, {
      attributesRaw: [{ name: 'groesse', value: { key: 'm', label: 'M' } }],
    });
    const piece = pieceFromProduct(
      product(v),
      resolveConfig({ sizeAttribute: 'groesse' })
    );
    expect(piece.sizes[0].label).toBe('M');
    expect(piece.oneSize).toBe(false);
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
