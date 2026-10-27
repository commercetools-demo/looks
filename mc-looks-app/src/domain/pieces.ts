import type { AppConfig } from '../config';
import { localeChain, pickLocale } from './format';
import { livePricesOfVariants, type RawPrice } from './prices';
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
  'variantAttributes' | 'colorNameAttribute' | 'colorAttribute'
>;

const attributeOf = (variant: RawVariant | undefined, name: string): unknown =>
  variant?.attributesRaw?.find((attribute) => attribute.name === name)?.value;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A text from a plain string, a number or boolean, a localized object, an
 * enum `{ key, label }`, or a set of those (joined with ", ").
 */
function textOf(value: unknown, locales: string[]): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => textOf(entry, locales))
      .filter((text): text is string => Boolean(text));
    return parts.length > 0 ? parts.join(', ') : undefined;
  }
  if (!isRecord(value)) return undefined;
  if ('label' in value) return textOf(value.label, locales);
  return pickLocale(value, locales);
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

  // A variant is told apart by its configured attributes (size, finish
  // colour, search colour, ...), in the configured order.
  const variantLabels = listed.map((variant) => {
    const parts = config.variantAttributes
      .map((name) => textOf(attributeOf(variant, name), locales))
      .filter((text): text is string => Boolean(text));
    return parts.length > 0 ? parts.join(' / ') : undefined;
  });
  // One size only for a single variant without any such attribute; several
  // variants are always listed, by SKU when nothing else tells them apart.
  const oneSize =
    listed.length === 1 && variantLabels.every((label) => label === undefined);

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
        label: variantLabels[index] ?? variant.sku ?? String(index + 1),
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

/** The piece with its list prices per cell (currency and country) in the given currencies. */
export function withPrices(
  piece: Piece,
  product: RawProduct,
  currencies: string[]
): Piece {
  const { masterVariant, variants } = product.masterData.current;
  return {
    ...piece,
    prices: livePricesOfVariants(
      [masterVariant, ...(variants ?? [])],
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
