import type {
  CartDiscountUpdateActionInput,
  buildLookCartDiscountDraft,
} from './look-actions';
import type { Operation } from './errors';
import type { LookDiscount, LookObject, LookValue, Piece } from './types';
import type { SalesOrder } from './past-looks';

export type CartDiscountDraftInput = ReturnType<
  typeof buildLookCartDiscountDraft
>;

export interface LookObjectDraft {
  container: string;
  key: string;
  value: LookValue;
  /** The object's current version; absent on create. */
  version?: number;
}

export interface RecentOrders {
  orders: SalesOrder[];
  /** The last page was full, so older orders in the window may be missing. */
  truncated: boolean;
}

/**
 * Everything the domain logic needs from the platform. The Apollo-backed
 * implementation lives in `hooks/use-looks-connector`; tests use a fake.
 */
export interface LookApi {
  fetchLookObjects(): Promise<LookObject[]>;
  fetchCartDiscounts(): Promise<LookDiscount[]>;
  getCartDiscount(id: string): Promise<LookDiscount>;
  getCartDiscountByKey(key: string): Promise<LookDiscount | undefined>;
  getLookObject(key: string): Promise<LookObject | undefined>;
  createCartDiscount(draft: CartDiscountDraftInput): Promise<LookDiscount>;
  updateCartDiscount(
    id: string,
    version: number,
    actions: CartDiscountUpdateActionInput[],
    operation: Extract<
      Operation,
      | 'activateDiscount'
      | 'switchDiscount'
      | 'changeDiscountValue'
      | 'completeDiscount'
    >
  ): Promise<LookDiscount>;
  /** Create (no `version`) or update (with the object's current `version`). */
  writeLookObject(draft: LookObjectDraft): Promise<LookObject>;
  fetchPieces(productIds: string[]): Promise<Map<string, Piece>>;
  searchPieces(text: string): Promise<{ total: number; pieces: Piece[] }>;
  fetchRecentOrders(sinceIso: string): Promise<RecentOrders>;
}
