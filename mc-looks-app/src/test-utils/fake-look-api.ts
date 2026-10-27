import { LookApiError } from '../domain/errors';
import type {
  CartDiscountDraftInput,
  LookApi,
  LookObjectDraft,
} from '../domain/look-api';
import { toLocalizedRecord } from '../domain/format';
import { countryOfPredicate } from '../hooks/use-looks-connector/conversion';
import type {
  LookDiscount,
  LookDiscountGroup,
  LookObject,
  Piece,
} from '../domain/types';

type Call = { method: string; args: unknown[] };

const fromLocalized = (
  entries: Array<{ locale: string; value: string }> | undefined
) => toLocalizedRecord(entries);

/** An in-memory `LookApi` with versions, key checks and failure injection. */
export function createFakeLookApi(
  initial: {
    objects?: LookObject[];
    discounts?: LookDiscount[];
    groups?: LookDiscountGroup[];
    pieces?: Piece[];
    orders?: Array<unknown>;
  } = {}
) {
  const objects = new Map(
    (initial.objects ?? []).map((o) => [o.key, { ...o }])
  );
  const discounts = new Map(
    (initial.discounts ?? []).map((d) => [d.id, { ...d }])
  );
  const groups = new Map((initial.groups ?? []).map((g) => [g.id, { ...g }]));
  const pieces = new Map((initial.pieces ?? []).map((p) => [p.id, p]));
  const calls: Call[] = [];
  const failures = new Map<string, Array<unknown>>();
  let nextId = 1;

  const record = (method: string, ...args: unknown[]) =>
    calls.push({ method, args });
  const maybeFail = (method: string) => {
    const queue = failures.get(method);
    if (queue && queue.length > 0) throw queue.shift();
  };

  const api: LookApi = {
    async fetchLookObjects() {
      record('fetchLookObjects');
      maybeFail('fetchLookObjects');
      return [...objects.values()].map((o) => ({ ...o }));
    },
    async fetchCartDiscounts() {
      record('fetchCartDiscounts');
      maybeFail('fetchCartDiscounts');
      return [...discounts.values()].map((d) => ({ ...d }));
    },
    async getCartDiscount(id) {
      record('getCartDiscount', id);
      maybeFail('getCartDiscount');
      const found = discounts.get(id);
      if (!found)
        throw new LookApiError('readLooks', 'unknown', undefined, {
          message: 'not found',
        });
      return { ...found };
    },
    async getCartDiscountByKey(key) {
      record('getCartDiscountByKey', key);
      maybeFail('getCartDiscountByKey');
      const found = [...discounts.values()].find((d) => d.key === key);
      return found ? { ...found } : undefined;
    },
    async getLookObject(key) {
      record('getLookObject', key);
      maybeFail('getLookObject');
      const found = objects.get(key);
      return found ? { ...found } : undefined;
    },
    async fetchDiscountGroups() {
      record('fetchDiscountGroups');
      maybeFail('fetchDiscountGroups');
      return [...groups.values()].map((g) => ({ ...g }));
    },
    async getDiscountGroupByKey(key) {
      record('getDiscountGroupByKey', key);
      maybeFail('getDiscountGroupByKey');
      const found = [...groups.values()].find((g) => g.key === key);
      return found ? { ...found } : undefined;
    },
    async createDiscountGroup(draft) {
      record('createDiscountGroup', draft);
      maybeFail('createDiscountGroup');
      if (
        [...groups.values()].some((g) => g.key === draft.key) ||
        [...groups.values(), ...discounts.values()].some(
          (entry) => entry.sortOrder === draft.sortOrder
        )
      ) {
        throw new LookApiError('createDiscountGroup', 'duplicate', undefined, {
          code: 'DuplicateField',
        });
      }
      const created: LookDiscountGroup = {
        id: `g${nextId++}`,
        version: 1,
        key: draft.key,
        sortOrder: draft.sortOrder,
        isActive: draft.isActive,
      };
      groups.set(created.id, created);
      return { ...created };
    },
    async updateDiscountGroup(id, version, actions, operation) {
      record('updateDiscountGroup', id, version, actions, operation);
      maybeFail('updateDiscountGroup');
      const current = groups.get(id);
      if (!current)
        throw new LookApiError(operation, 'unknown', undefined, {
          message: 'not found',
        });
      if (current.version !== version) {
        throw new LookApiError(operation, 'conflict', undefined, {
          statusCode: 409,
          code: 'ConcurrentModification',
        });
      }
      const next = { ...current, version: current.version + 1 };
      for (const action of actions) next.isActive = action.setIsActive.isActive;
      groups.set(id, next);
      return { ...next };
    },
    async createCartDiscount(draft: CartDiscountDraftInput) {
      record('createCartDiscount', draft);
      maybeFail('createCartDiscount');
      if ([...discounts.values()].some((d) => d.key === draft.key)) {
        throw new LookApiError('createDiscount', 'duplicate', undefined, {
          code: 'DuplicateField',
          field: 'key',
        });
      }
      const money =
        'absoluteCart' in draft.value ? draft.value.absoluteCart.money : [];
      const created: LookDiscount = {
        id: `d${nextId++}`,
        version: 1,
        key: draft.key,
        isActive: draft.isActive,
        // A discount in a group uses the group's rank.
        sortOrder:
          [...groups.values()].find((g) => g.key === draft.discountGroup?.key)
            ?.sortOrder ?? '0',
        createdAt: '2026-10-01T00:00:00.000Z',
        name: fromLocalized(draft.name),
        description: fromLocalized(draft.description),
        amount: Object.fromEntries(
          money.map((m) => [m.currencyCode, m.centAmount])
        ),
        country: countryOfPredicate(draft.cartPredicate),
        pieceIds: draft.target.pattern.targetPattern.map(
          (c) => /"([^"]+)"/.exec(c.CountOnLineItemUnits.predicate)![1]
        ),
      };
      discounts.set(created.id, created);
      return { ...created };
    },
    async updateCartDiscount(id, version, actions, operation) {
      record('updateCartDiscount', id, version, actions, operation);
      maybeFail('updateCartDiscount');
      const current = discounts.get(id);
      if (!current)
        throw new LookApiError(operation, 'unknown', undefined, {
          message: 'not found',
        });
      if (current.version !== version) {
        throw new LookApiError(operation, 'conflict', undefined, {
          statusCode: 409,
          code: 'ConcurrentModification',
        });
      }
      const next = { ...current, version: current.version + 1 };
      for (const action of actions) {
        if ('changeIsActive' in action)
          next.isActive = action.changeIsActive.isActive;
        if ('changeValue' in action) {
          next.amount = Object.fromEntries(
            action.changeValue.value.absoluteCart.money.map((m) => [
              m.currencyCode,
              m.centAmount,
            ])
          );
        }
        if ('changeName' in action)
          next.name = fromLocalized(action.changeName.name);
        if ('setDescription' in action)
          next.description = fromLocalized(action.setDescription.description);
      }
      discounts.set(id, next);
      return { ...next };
    },
    async writeLookObject(draft: LookObjectDraft) {
      record('writeLookObject', draft);
      maybeFail('writeLookObject');
      const current = objects.get(draft.key);
      if (
        draft.version !== undefined &&
        current &&
        current.version !== draft.version
      ) {
        throw new LookApiError('writeLookObject', 'conflict', undefined, {
          statusCode: 409,
        });
      }
      const written: LookObject = {
        id: current?.id ?? `o${nextId++}`,
        version: (current?.version ?? 0) + 1,
        key: draft.key,
        value: draft.value,
      };
      objects.set(draft.key, written);
      return { ...written };
    },
    async fetchPieces(ids) {
      record('fetchPieces', ids);
      maybeFail('fetchPieces');
      return new Map(
        ids.filter((id) => pieces.has(id)).map((id) => [id, pieces.get(id)!])
      );
    },
    async searchPieces(text) {
      record('searchPieces', text);
      maybeFail('searchPieces');
      const found = [...pieces.values()].filter((p) =>
        p.name.toLowerCase().includes(text.toLowerCase())
      );
      return { total: found.length, pieces: found };
    },
    async fetchRecentOrders(since) {
      record('fetchRecentOrders', since);
      maybeFail('fetchRecentOrders');
      return { orders: (initial.orders ?? []) as never[], truncated: false };
    },
  };

  return {
    api,
    calls,
    objects,
    discounts,
    groups,
    callsTo: (method: string) => calls.filter((c) => c.method === method),
    /** The next call to `method` throws `error` (queued, in order). */
    failNext(method: string, error: unknown = new Error(`${method} failed`)) {
      failures.set(method, [...(failures.get(method) ?? []), error]);
    },
  };
}
