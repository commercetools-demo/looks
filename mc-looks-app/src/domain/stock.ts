import { LOW_STOCK_MAX } from './limits';
import type { PieceSize } from './types';

export type StockState = 'sold-out' | 'low' | 'ok';

/** 0 is sold out, 1 to `LOW_STOCK_MAX` is low stock, more is plain stock. */
export function stockStateOf(quantity: number): StockState {
  if (quantity <= 0) return 'sold-out';
  return quantity <= LOW_STOCK_MAX ? 'low' : 'ok';
}

/** The sizes with 1 to 3 left and the sold-out ones. */
export function summarizeSizes(sizes: PieceSize[]): {
  low: Array<{ label: string; quantity: number }>;
  soldOut: string[];
} {
  return {
    low: sizes
      .filter((size) => stockStateOf(size.availableQuantity) === 'low')
      .map((size) => ({ label: size.label, quantity: size.availableQuantity })),
    soldOut: sizes
      .filter((size) => stockStateOf(size.availableQuantity) === 'sold-out')
      .map((size) => size.label),
  };
}
