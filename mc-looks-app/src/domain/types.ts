/** Cent amounts per currency code. */
export type Money = Record<string, number>;

/** A localized value as a plain record (locale to text). */
export type LocalizedValue = Record<string, string>;

export interface LookImage {
  path: string;
  width: number;
  height: number;
}

/** The Custom Object value, container `look` (contracts/look-value.schema.json). */
export interface LookValue {
  componentProductIds: string[];
  setPrice: Money;
  image?: LookImage;
  endedAt?: string;
}

export interface LookObject {
  id: string;
  version: number;
  key: string;
  value: LookValue;
}

/** A set-price Cart Discount, normalised from the GraphQL shape. */
export interface LookDiscount {
  id: string;
  version: number;
  key: string;
  isActive: boolean;
  sortOrder: string;
  createdAt: string;
  name: LocalizedValue;
  description: LocalizedValue;
  /** Absolute discount amount per currency. */
  amount: Money;
  /** Product ids named by the pattern target, in order. */
  pieceIds: string[];
}

export interface PieceSize {
  sku?: string;
  label: string;
  availableQuantity: number;
}

/** One product as the app shows it (data-model.md, Piece). */
export interface Piece {
  id: string;
  name: string;
  imageUrl?: string;
  colour?: string;
  prices: Money;
  sizes: PieceSize[];
  /** No variant has a size attribute: shown as "Einheitsgröße". */
  oneSize: boolean;
  soldOutEverywhere: boolean;
}

/** What the user enters for a new look. */
export interface NewLook {
  label: { de: string; en: string };
  componentProductIds: string[];
  setPrice: Money;
  /** The live sum the set price was checked against. */
  sum: Money;
  image?: LookImage;
}

/** One look as the builders know it (key is the slug part, without prefix). */
export interface LookInput extends NewLook {
  key: string;
}
