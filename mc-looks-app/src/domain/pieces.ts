import type { AppConfig } from '../config';
import { localeChain } from './format';
import { livePricesOf, type RawPrice } from './prices';
import type { LocalizedValue, Piece, PieceSize } from './types';

export interface RawVariant {
  sku?: string | null;
  images?: ReadonlyArray<{ url: string }> | null;
  prices?: ReadonlyArray<RawPrice> | null;
  attributesRaw?: ReadonlyArray<{ name: string; value: unknown }> | null;
  availability?: {
    noChannel?: { availableQuantity?: number | null } | null;
  } | null;
}

export interface RawProduct {
  id: string;
  masterData: {
    current: {
      name?: string | null;
      masterVariant: RawVariant;
      variants?: ReadonlyArray<RawVariant> | null;
    };
  };
}

type AttributeConfig = Pick<
  AppConfig,
  'sizeAttribute' | 'colorNameAttribute' | 'colorAttribute'
>;

const attributeOf = (variant: RawVariant | undefined, name: string): unknown =>
  variant?.attributesRaw?.find((attribute) => attribute.name === name)?.value;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A text from a plain string, a localized object or an enum `{ key, label }`. */
function textOf(value: unknown, locales: string[]): string | undefined {
  if (typeof value === 'string') return value || undefined;
  if (!isRecord(value)) return undefined;
  if ('label' in value) return textOf(value.label, locales);
  for (const locale of locales) {
    const text = value[locale];
    if (typeof text === 'string' && text) return text;
  }
  const first = Object.values(value).find(
    (entry): entry is string => typeof entry === 'string' && entry.length > 0
  );
  return first;
}

/** The variant's default-inventory quantity, `undefined` without an entry. */
function stockOf(variant: RawVariant): number | undefined {
  const quantity = variant.availability?.noChannel?.availableQuantity;
  return quantity === null || quantity === undefined ? undefined : quantity;
}

/**
 * Maps a product to a `Piece` (FR-032): sizes are the variants having a
 * default inventory entry (a second colour group without any entry is not
 * listed, so no size appears twice); if none has an entry, all variants are
 * listed as sold out. The image is the master variant's, else the first
 * variant's that has one.
 */
export function pieceFromProduct(
  product: RawProduct,
  config: AttributeConfig,
  dataLocale?: string
): Piece {
  const locales = localeChain(dataLocale);
  const current = product.masterData.current;
  const variants = [current.masterVariant, ...(current.variants ?? [])];
  const stocked = variants.filter((variant) => stockOf(variant) !== undefined);
  const listed = stocked.length > 0 ? stocked : variants;

  const sizeLabels = listed.map((variant) =>
    textOf(attributeOf(variant, config.sizeAttribute), locales)
  );
  const oneSize = sizeLabels.every((label) => label === undefined);

  const sizes: PieceSize[] = oneSize
    ? [
        {
          sku: listed[0]?.sku ?? undefined,
          label: '',
          availableQuantity: listed.reduce(
            (sum, variant) => sum + (stockOf(variant) ?? 0),
            0
          ),
        },
      ]
    : listed.map((variant, index) => ({
        sku: variant.sku ?? undefined,
        label: sizeLabels[index] ?? variant.sku ?? '',
        availableQuantity: stockOf(variant) ?? 0,
      }));

  const colourVariant = stocked[0] ?? current.masterVariant;
  const colour =
    textOf(attributeOf(colourVariant, config.colorNameAttribute), locales) ??
    textOf(attributeOf(colourVariant, config.colorAttribute), locales);

  const imageUrl = [current.masterVariant, ...stocked, ...variants].find(
    (variant) => variant.images?.[0]?.url
  )?.images?.[0]?.url;

  return {
    id: product.id,
    name: current.name ?? product.id,
    imageUrl,
    colour,
    prices: {}, // filled by `withPrices`, which needs the project currencies
    sizes,
    oneSize,
    soldOutEverywhere:
      sizes.length > 0 && sizes.every((size) => size.availableQuantity <= 0),
  };
}

/** The piece with its list prices in the given currencies. */
export function withPrices(
  piece: Piece,
  product: RawProduct,
  currencies: string[]
): Piece {
  return {
    ...piece,
    prices: livePricesOf(
      product.masterData.current.masterVariant.prices,
      currencies
    ),
  };
}

/** Product to `Piece` with prices, in one call. */
export function toPiece(
  product: RawProduct,
  config: AttributeConfig,
  currencies: string[],
  dataLocale?: string
): Piece {
  return withPrices(
    pieceFromProduct(product, config, dataLocale),
    product,
    currencies
  );
}

/** Live prices per piece id, the shape `validateLook` and `sumListPrices` take. */
export function livePriceMap(
  pieces: Iterable<Piece>
): Map<string, Record<string, number>> {
  const map = new Map<string, Record<string, number>>();
  for (const piece of pieces) map.set(piece.id, piece.prices);
  return map;
}

export type { LocalizedValue };
