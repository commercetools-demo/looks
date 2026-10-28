import type { ApolloClient } from '@apollo/client';
import { localeChain } from '../../domain/format';
import { LOOK_CONTAINER, PAGE } from '../../domain/limits';
import { toLookApiError, type Operation } from '../../domain/errors';
import type { LookApi, RecentOrders } from '../../domain/look-api';
import { lookKeyFromObjectKey } from '../../domain/keys';
import type { SalesOrder } from '../../domain/past-looks';
import { toPiece, type RawProduct } from '../../domain/pieces';
import type {
  LookDiscount,
  LookDiscountGroup,
  LookObject,
  Piece,
} from '../../domain/types';
import type { AppConfig } from '../../config';
import { mcApiContext } from '../shared/mc-api-context';
import {
  toLookDiscount,
  toLookObject,
  type RawLookDiscount,
  type RawLookObject,
} from './conversion';
import FetchLookObjectsQuery from './fetch-look-objects.graphql';
import FetchCartDiscountsQuery from './fetch-cart-discounts.graphql';
import FetchDiscountQuery from './fetch-discount.graphql';
import FetchObjectQuery from './fetch-object.graphql';
import DeleteDiscountMutation from './delete-discount.graphql';
import DeleteDiscountGroupMutation from './delete-discount-group.graphql';
import DeleteObjectMutation from './delete-object.graphql';
import FetchDiscountGroupQuery from './fetch-discount-group.graphql';
import FetchDiscountGroupsQuery from './fetch-discount-groups.graphql';
import CreateDiscountGroupMutation from './create-discount-group.graphql';
import UpdateDiscountGroupMutation from './update-discount-group.graphql';
import CreateDiscountMutation from './create-discount.graphql';
import UpdateDiscountMutation from './update-discount.graphql';
import WriteObjectMutation from './write-object.graphql';
import FetchPiecesQuery from '../use-pieces-connector/fetch-pieces.graphql';
import SearchPiecesQuery from '../use-pieces-connector/search-pieces.graphql';
import FetchRecentOrdersQuery from '../use-orders-connector/fetch-recent-orders.graphql';

/** Orders are read in at most this many pages of `PAGE`. */
export const ORDERS_PAGE_LIMIT = 4;

export interface LookApiContext {
  currencies: string[];
  dataLocale?: string;
  config: Pick<
    AppConfig,
    'variantAttributes' | 'colorNameAttribute' | 'colorAttribute'
  >;
}

type Client = Pick<ApolloClient<unknown>, 'query' | 'mutate'>;

/**
 * The Apollo-backed implementation of `LookApi`. Every call runs through the
 * Merchant Center GraphQL proxy (`ctp` target) and bypasses the cache for
 * reads that feed a write, so versions are never stale. Failures are mapped
 * to `LookApiError`, which names the operation.
 */
export function createLookApi(
  client: Client,
  context: LookApiContext
): LookApi {
  const acceptLanguage = localeChain(context.dataLocale);

  async function read<T>(
    operation: Operation,
    query: unknown,
    variables: Record<string, unknown>
  ): Promise<T> {
    try {
      const result = await client.query({
        query: query as never,
        variables,
        context: mcApiContext,
        fetchPolicy: 'no-cache',
      });
      return result.data as T;
    } catch (error) {
      throw toLookApiError(operation, error);
    }
  }

  async function write<T>(
    operation: Operation,
    mutation: unknown,
    variables: Record<string, unknown>
  ): Promise<T> {
    try {
      const result = await client.mutate({
        mutation: mutation as never,
        variables,
        context: mcApiContext,
      });
      if (result.errors?.length) {
        throw Object.assign(new Error(result.errors[0].message), {
          graphQLErrors: result.errors,
        });
      }
      return result.data as T;
    } catch (error) {
      throw toLookApiError(operation, error);
    }
  }

  async function paged<T>(
    operation: Operation,
    query: unknown,
    field: string
  ): Promise<T[]> {
    const results: T[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const data = await read<Record<string, { results: T[] }>>(
        operation,
        query,
        {
          limit: PAGE,
          offset,
        }
      );
      const page = data[field].results;
      results.push(...page);
      if (page.length < PAGE) return results;
    }
  }

  const rawPieces = (products: RawProduct[]): Map<string, Piece> =>
    new Map(
      products.map((product) => [
        product.id,
        toPiece(
          product,
          context.config,
          context.currencies,
          context.dataLocale
        ),
      ])
    );

  return {
    async fetchLookObjects() {
      const raw = await paged<RawLookObject>(
        'readLooks',
        FetchLookObjectsQuery,
        'customObjects'
      );
      return raw.map(toLookObject).filter((o): o is LookObject => !!o);
    },

    async fetchCartDiscounts() {
      const raw = await paged<RawLookDiscount>(
        'readLooks',
        FetchCartDiscountsQuery,
        'cartDiscounts'
      );
      return raw.map(toLookDiscount);
    },

    async getCartDiscount(id) {
      const data = await read<{ cartDiscount: RawLookDiscount | null }>(
        'readLooks',
        FetchDiscountQuery,
        { id }
      );
      if (!data.cartDiscount)
        throw toLookApiError(
          'readLooks',
          new Error(`Cart Discount ${id} not found`)
        );
      return toLookDiscount(data.cartDiscount);
    },

    async getCartDiscountByKey(key) {
      const data = await read<{ cartDiscount: RawLookDiscount | null }>(
        'readLooks',
        FetchDiscountQuery,
        { key }
      );
      return data.cartDiscount ? toLookDiscount(data.cartDiscount) : undefined;
    },

    async getLookObject(key) {
      if (!lookKeyFromObjectKey(key)) return undefined;
      const data = await read<{ customObject: RawLookObject | null }>(
        'readLooks',
        FetchObjectQuery,
        { key }
      );
      return data.customObject ? toLookObject(data.customObject) : undefined;
    },

    async fetchDiscountGroups() {
      return paged<LookDiscountGroup>(
        'readLooks',
        FetchDiscountGroupsQuery,
        'discountGroups'
      );
    },

    async getDiscountGroupByKey(key) {
      const data = await read<{ discountGroup: LookDiscountGroup | null }>(
        'readLooks',
        FetchDiscountGroupQuery,
        { key }
      );
      return data.discountGroup ?? undefined;
    },

    async createDiscountGroup(draft) {
      const data = await write<{ createDiscountGroup: LookDiscountGroup }>(
        'createDiscountGroup',
        CreateDiscountGroupMutation,
        { draft }
      );
      return data.createDiscountGroup;
    },

    async updateDiscountGroup(id, version, actions, operation) {
      const data = await write<{ updateDiscountGroup: LookDiscountGroup }>(
        operation,
        UpdateDiscountGroupMutation,
        { id, version, actions }
      );
      return data.updateDiscountGroup;
    },

    async createCartDiscount(draft) {
      const data = await write<{ createCartDiscount: RawLookDiscount }>(
        'createDiscount',
        CreateDiscountMutation,
        { draft }
      );
      return toLookDiscount(data.createCartDiscount);
    },

    async updateCartDiscount(id, version, actions, operation) {
      const data = await write<{ updateCartDiscount: RawLookDiscount }>(
        operation,
        UpdateDiscountMutation,
        { id, version, actions }
      );
      return toLookDiscount(data.updateCartDiscount);
    },

    async writeLookObject(draft) {
      const data = await write<{ createOrUpdateCustomObject: RawLookObject }>(
        'writeLookObject',
        WriteObjectMutation,
        {
          draft: {
            container: draft.container ?? LOOK_CONTAINER,
            key: draft.key,
            value: JSON.stringify(draft.value),
            ...(draft.version !== undefined ? { version: draft.version } : {}),
          },
        }
      );
      const object = toLookObject(data.createOrUpdateCustomObject);
      if (!object)
        throw toLookApiError(
          'writeLookObject',
          new Error('The saved object is not a look.')
        );
      return object;
    },

    async deleteCartDiscount(id, version) {
      await write('deleteLook', DeleteDiscountMutation, { id, version });
    },

    async deleteDiscountGroup(id, version) {
      await write('deleteLook', DeleteDiscountGroupMutation, { id, version });
    },

    async deleteLookObject(key, version) {
      await write('deleteLook', DeleteObjectMutation, {
        container: LOOK_CONTAINER,
        key,
        version,
      });
    },

    async fetchPieces(productIds) {
      const ids = [...new Set(productIds)];
      const pieces = new Map<string, Piece>();
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const where = `id in (${chunk
          .map((id) => JSON.stringify(id))
          .join(', ')})`;
        const data = await read<{ products: { results: RawProduct[] } }>(
          'readProducts',
          FetchPiecesQuery,
          { where, acceptLanguage }
        );
        rawPieces(data.products.results).forEach((piece, id) =>
          pieces.set(id, piece)
        );
      }
      return pieces;
    },

    async searchPieces(text) {
      const language = context.dataLocale ?? 'de';
      const term = text.trim();
      const query = term
        ? {
            wildcard: {
              field: 'name',
              language,
              value: `*${term}*`,
              caseInsensitive: true,
            },
          }
        : { exists: { field: 'name', language } };
      const data = await read<{
        productsSearch: {
          total: number;
          results: Array<{ product: RawProduct }>;
        };
      }>('searchProducts', SearchPiecesQuery, { query, acceptLanguage });
      return {
        total: data.productsSearch.total,
        pieces: data.productsSearch.results.map(({ product }) =>
          toPiece(
            product,
            context.config,
            context.currencies,
            context.dataLocale
          )
        ),
      };
    },

    async fetchRecentOrders(sinceIso): Promise<RecentOrders> {
      const orders: SalesOrder[] = [];
      const where = `createdAt >= "${sinceIso}"`;
      for (let page = 0; page < ORDERS_PAGE_LIMIT; page += 1) {
        const data = await read<{ orders: { results: SalesOrder[] } }>(
          'readOrders',
          FetchRecentOrdersQuery,
          {
            where,
            limit: PAGE,
            offset: page * PAGE,
          }
        );
        orders.push(...data.orders.results);
        if (data.orders.results.length < PAGE)
          return { orders, truncated: false };
      }
      return { orders, truncated: true };
    },
  };
}

export type { LookDiscount };
