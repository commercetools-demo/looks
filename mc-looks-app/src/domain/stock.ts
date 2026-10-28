import { LOW_STOCK_MAX } from './limits';

export type StockState = 'sold-out' | 'low' | 'ok';

/** 0 is sold out, 1 to `LOW_STOCK_MAX` is low stock, more is plain stock. */
export function stockStateOf(quantity: number): StockState {
  if (quantity <= 0) return 'sold-out';
  return quantity <= LOW_STOCK_MAX ? 'low' : 'ok';
}
