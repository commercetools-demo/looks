import { stockStateOf, type StockState } from '../../domain/stock';
import type { Money, Piece } from '../../domain/types';
import { referencePrice } from '../../domain/prices';

export interface PreviewRow {
  id: string;
  name: string;
  imageUrl?: string;
  /** The piece's list price in the preview currency. */
  price?: number;
  oneSize: boolean;
  /** Sold out in every size, low stock (1 to 3) in the shown size, or plain. */
  sizeState: StockState;
  /** The first size that can be bought (the first one when none can). */
  sizeLabel: string;
  /** Quantity of the shown size, for "nur noch N". */
  quantity: number;
}

export interface PreviewModel {
  currency: string;
  /** `undefined` while there is no usable set price ("Setpreis folgt"). */
  setPrice?: number;
  /** Sum of the pieces' list prices; `undefined` when a piece has no price. */
  sum?: number;
  /** Sum minus set price, only when the set price is below the sum. */
  saving?: number;
  rows: PreviewRow[];
}

export interface PreviewInput {
  pieces: Array<Piece | undefined>;
  setPrice?: Money;
  sum?: Money;
  currency: string;
}

function rowOf(piece: Piece, currency: string): PreviewRow {
  const available = piece.sizes.find(
    (size) => stockStateOf(size.availableQuantity) !== 'sold-out'
  );
  const shown = available ?? piece.sizes[0];
  const everySoldOut = piece.sizes.every(
    (size) => stockStateOf(size.availableQuantity) === 'sold-out'
  );
  return {
    id: piece.id,
    name: piece.name,
    imageUrl: piece.imageUrl,
    price: referencePrice(piece.prices, currency),
    oneSize: piece.oneSize,
    sizeState: everySoldOut
      ? 'sold-out'
      : stockStateOf(shown?.availableQuantity ?? 0),
    sizeLabel: shown?.label ?? '',
    quantity: shown?.availableQuantity ?? 0,
  };
}

/** What the card shows, in the first project currency. */
export function buildPreview({
  pieces,
  setPrice,
  sum,
  currency,
}: PreviewInput): PreviewModel {
  const present = pieces.filter((piece): piece is Piece => piece !== undefined);
  const rows = present.map((piece) => rowOf(piece, currency));
  let liveSum = referencePrice(sum, currency);
  if (sum === undefined) {
    const prices = rows.map((row) => row.price);
    liveSum = prices.every((price) => price !== undefined)
      ? (prices as number[]).reduce((total, price) => total + price, 0)
      : undefined;
  }
  const set = referencePrice(setPrice, currency);
  const usableSet = set !== undefined && set > 0 ? set : undefined;
  const saving =
    usableSet !== undefined && liveSum !== undefined && usableSet < liveSum
      ? liveSum - usableSet
      : undefined;
  return { currency, setPrice: usableSet, sum: liveSum, saving, rows };
}
