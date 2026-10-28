/** Cent amounts per currency code. */
export type Money = Record<string, number>;

/** A localized value as a plain record (locale to text). */
export type LocalizedValue = Record<string, string>;

/** The Custom Object value, container `look` (contracts/look-value.schema.json). */
export interface LookValue {
  componentProductIds: string[];
  setPrice: Money;
  /** Cells (like `EUR/DE`) whose discount is a percentage: 0 < p < 100, at
   *  most one decimal. Every other priced cell is an absolute discount. */
  savingPercent?: Record<string, number>;
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
  /** The percentage in permyriad (1250 = 12.5 %) of a relative discount;
   *  `undefined` for an absolute one. */
  permyriad?: number;
  /** The country the discount applies in (`cartPredicate`), `''` for carts
   *  without a country; `undefined` when the predicate is not the app's. */
  country?: string;
  /** Product ids named by the pattern target, in order. */
  pieceIds: string[];
}

/** The Discount Group a look's Cart Discounts live in (key `look-<key>`). */
export interface LookDiscountGroup {
  id: string;
  version: number;
  key: string;
  sortOrder: string;
  /** The group must be active for its Cart Discounts to apply. */
  isActive: boolean;
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
  prices: Money;
  sizes: PieceSize[];
  /** No variant has a size attribute: shown as "Einheitsgröße". */
  oneSize: boolean;
  soldOutEverywhere: boolean;
}

/** What the user enters for a new look. */
export interface NewLook {
  /** The look key (without the `look-` prefix) when the user chose one;
   *  otherwise it is derived from the name when saving. */
  key?: string;
  /** The look name per project language; empty translations are omitted. */
  label: LocalizedValue;
  /** The look description per project language (optional); empty
   *  translations are omitted. It becomes the Discount Group's description. */
  description?: LocalizedValue;
  componentProductIds: string[];
  setPrice: Money;
  /** Cells whose discount is a percentage (a relative Cart Discount); the
   *  other cells in `setPrice` get an absolute one. `setPrice` still holds
   *  every priced cell, for a percentage cell the derived price. */
  savingPercent?: Record<string, number>;
  /** The live sum the set price was checked against. */
  sum: Money;
}

/** One look as the builders know it (key is the slug part, without prefix). */
export interface LookInput extends NewLook {
  key: string;
}
