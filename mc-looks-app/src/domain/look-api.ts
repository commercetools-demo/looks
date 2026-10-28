import type {
  CartDiscountUpdateActionInput,
  buildLookCartDiscountDrafts,
} from './look-actions';
import type { Operation } from './errors';
import type {
  LookDiscount,
  LookDiscountGroup,
  LookObject,
  LookValue,
  Piece,
} from './types';
import type { SalesOrder } from './past-looks';

export type CartDiscountDraftInput = ReturnType<
  typeof buildLookCartDiscountDrafts
>[number];

export interface DiscountGroupDraftInput {
  key: string;
  sortOrder: string;
  name: Array<{ locale: string; value: string }>;
  isActive: boolean;
}

export type DiscountGroupUpdateActionInput = {
  setIsActive: { isActive: boolean };
};

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
  fetchDiscountGroups(): Promise<LookDiscountGroup[]>;
  getDiscountGroupByKey(key: string): Promise<LookDiscountGroup | undefined>;
  createDiscountGroup(
    draft: DiscountGroupDraftInput
  ): Promise<LookDiscountGroup>;
  updateDiscountGroup(
    id: string,
    version: number,
    actions: DiscountGroupUpdateActionInput[],
    operation: Extract<Operation, 'switchDiscountGroup'>
  ): Promise<LookDiscountGroup>;
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
  /** Deletes with the resource's current `version`. */
  deleteCartDiscount(id: string, version: number): Promise<void>;
  deleteDiscountGroup(id: string, version: number): Promise<void>;
  deleteLookObject(key: string, version: number): Promise<void>;
  fetchPieces(productIds: string[]): Promise<Map<string, Piece>>;
  searchPieces(text: string): Promise<{ total: number; pieces: Piece[] }>;
  fetchRecentOrders(sinceIso: string): Promise<RecentOrders>;
}
