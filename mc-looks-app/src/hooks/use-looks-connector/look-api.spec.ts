import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import crossFetch from 'cross-fetch';
import { graphql } from 'msw';
import { setupServer } from 'msw/node';
import { LookApiError } from '../../domain/errors';
import { PAGE } from '../../domain/limits';
import { createLookApi, ORDERS_PAGE_LIMIT } from './look-api';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const createApi = () =>
  createLookApi(
    new ApolloClient({
      link: new HttpLink({
        uri: 'http://graphql.test/graphql',
        fetch: crossFetch,
      }),
      cache: new InMemoryCache(),
    }),
    {
      currencies: ['EUR', 'CHF'],
      dataLocale: 'de',
      config: {
        variantAttributes: ['size'],
      },
    }
  );

const rawObject = (index: number) => ({
  __typename: 'CustomObject',
  id: `o${index}`,
  version: 1,
  key: `look-k${index}`,
  value: { componentProductIds: ['a', 'b'], setPrice: { EUR: 100 } },
});

const rawDiscount = (
  index: number,
  overrides: Record<string, unknown> = {}
) => ({
  __typename: 'CartDiscount',
  id: `d${index}`,
  version: 3,
  key: `look-k${index}`,
  isActive: true,
  sortOrder: '0.7',
  cartPredicate: 'country = "DE"',
  createdAt: '2026-09-30T08:00:00.000Z',
  nameAllLocales: [
    { __typename: 'LocalizedString', locale: 'de', value: 'Look-Set: Büro' },
  ],
  descriptionAllLocales: [
    { __typename: 'LocalizedString', locale: 'de', value: 'Büro' },
  ],
  value: {
    __typename: 'AbsoluteCartDiscountValue',
    type: 'absolute',
    applicationMode: 'ProportionateDistribution',
    money: [
      { __typename: 'Money', currencyCode: 'EUR', centAmount: 2000 },
      { __typename: 'Money', currencyCode: 'CHF', centAmount: 2200 },
    ],
  },
  target: {
    __typename: 'CartDiscountPatternTarget',
    type: 'pattern',
    targetPattern: [
      {
        __typename: 'CountOnLineItemUnits',
        predicate: 'product.id = "a"',
        minCount: 1,
        maxCount: 1,
      },
      {
        __typename: 'CountOnLineItemUnits',
        predicate: 'product.id = "b"',
        minCount: 1,
        maxCount: 1,
      },
    ],
  },
  ...overrides,
});

const rawGroup = (index: number, overrides: Record<string, unknown> = {}) => ({
  __typename: 'DiscountGroup',
  id: `g${index}`,
  version: 2,
  key: `look-k${index}`,
  sortOrder: '0.7',
  isActive: false,
  ...overrides,
});

const pageOf = <T>(size: number, build: (index: number) => T, offset: number) =>
  Array.from({ length: size }, (_, i) => build(offset + i));

describe('createLookApi', () => {
  it('pages the look objects by 500 and stops on a short page', async () => {
    const variables: unknown[] = [];
    server.use(
      graphql.query('FetchLookObjects', (req, res, ctx) => {
        variables.push(req.variables);
        const { offset } = req.variables as { offset: number };
        const size = offset === 0 ? PAGE : 3;
        return res(
          ctx.data({
            customObjects: {
              __typename: 'CustomObjectQueryResult',
              total: PAGE + 3,
              results: pageOf(size, rawObject, offset),
            },
          })
        );
      })
    );
    const objects = await createApi().fetchLookObjects();
    expect(objects).toHaveLength(PAGE + 3);
    expect(variables).toEqual([
      { limit: PAGE, offset: 0 },
      { limit: PAGE, offset: PAGE },
    ]);
  });

  it('reads a single request when the first discount page is short', async () => {
    const variables: unknown[] = [];
    server.use(
      graphql.query('FetchCartDiscounts', (req, res, ctx) => {
        variables.push(req.variables);
        return res(
          ctx.data({
            cartDiscounts: {
              __typename: 'CartDiscountQueryResult',
              total: 2,
              results: [rawDiscount(1), rawDiscount(2)],
            },
          })
        );
      })
    );
    expect(await createApi().fetchCartDiscounts()).toHaveLength(2);
    expect(variables).toEqual([{ limit: PAGE, offset: 0 }]);
  });

  it('pages the cart discounts by 500', async () => {
    const offsets: number[] = [];
    server.use(
      graphql.query('FetchCartDiscounts', (req, res, ctx) => {
        const { offset } = req.variables as { offset: number };
        offsets.push(offset);
        return res(
          ctx.data({
            cartDiscounts: {
              __typename: 'CartDiscountQueryResult',
              total: PAGE + 1,
              results: pageOf(offset === 0 ? PAGE : 1, rawDiscount, offset),
            },
          })
        );
      })
    );
    expect(await createApi().fetchCartDiscounts()).toHaveLength(PAGE + 1);
    expect(offsets).toEqual([0, PAGE]);
  });

  it('converts the discount value and target to a LookDiscount', async () => {
    server.use(
      graphql.query('FetchLookDiscount', (_req, res, ctx) =>
        res(ctx.data({ cartDiscount: rawDiscount(1) }))
      )
    );
    expect(await createApi().getCartDiscount('d1')).toEqual({
      id: 'd1',
      version: 3,
      key: 'look-k1',
      isActive: true,
      sortOrder: '0.7',
      createdAt: '2026-09-30T08:00:00.000Z',
      name: { de: 'Look-Set: Büro' },
      description: { de: 'Büro' },
      amount: { EUR: 2000, CHF: 2200 },
      country: 'DE',
      pieceIds: ['a', 'b'],
    });
  });

  it('sends id, version and actions for UpdateLookDiscount', async () => {
    let received: unknown;
    server.use(
      graphql.mutation('UpdateLookDiscount', (req, res, ctx) => {
        received = req.variables;
        return res(
          ctx.data({
            updateCartDiscount: rawDiscount(1, { isActive: false, version: 4 }),
          })
        );
      })
    );
    const actions = [{ changeIsActive: { isActive: false } }];
    const updated = await createApi().updateCartDiscount(
      'd1',
      3,
      actions,
      'switchDiscount'
    );
    expect(received).toEqual({ id: 'd1', version: 3, actions });
    expect(updated.isActive).toBe(false);
    expect(updated.version).toBe(4);
  });

  it('writes the look object as a JSON string in container "look", with the version on update', async () => {
    const drafts: Array<{ draft: Record<string, unknown> }> = [];
    server.use(
      graphql.mutation('WriteLookObject', (req, res, ctx) => {
        drafts.push(req.variables as never);
        return res(ctx.data({ createOrUpdateCustomObject: rawObject(1) }));
      })
    );
    const value = { componentProductIds: ['a', 'b'], setPrice: { EUR: 100 } };
    const api = createApi();
    await api.writeLookObject({
      container: 'look',
      key: 'look-k1',
      value,
      version: 5,
    });
    await api.writeLookObject({ container: 'look', key: 'look-k1', value });
    expect(drafts[0].draft).toEqual({
      container: 'look',
      key: 'look-k1',
      value: JSON.stringify(value),
      version: 5,
    });
    expect(drafts[1].draft).not.toHaveProperty('version');
  });

  it('reads at most four pages of orders and reports truncation', async () => {
    const calls: Array<Record<string, unknown>> = [];
    server.use(
      graphql.query('FetchRecentOrders', (req, res, ctx) => {
        calls.push(req.variables);
        const { offset } = req.variables as { offset: number };
        return res(
          ctx.data({
            orders: {
              __typename: 'OrderQueryResult',
              results: pageOf(
                PAGE,
                (i) => ({ __typename: 'Order', id: `o${i}`, lineItems: [] }),
                offset
              ),
            },
          })
        );
      })
    );
    const result = await createApi().fetchRecentOrders(
      '2026-07-01T00:00:00.000Z'
    );
    expect(calls).toHaveLength(ORDERS_PAGE_LIMIT);
    expect(calls.map((call) => call.offset)).toEqual([
      0,
      PAGE,
      2 * PAGE,
      3 * PAGE,
    ]);
    expect(calls[0].where).toBe('createdAt >= "2026-07-01T00:00:00.000Z"');
    expect(result.orders).toHaveLength(ORDERS_PAGE_LIMIT * PAGE);
    expect(result.truncated).toBe(true);
  });

  it('stops reading orders on a short page and is not truncated then', async () => {
    let count = 0;
    server.use(
      graphql.query('FetchRecentOrders', (req, res, ctx) => {
        count += 1;
        const { offset } = req.variables as { offset: number };
        return res(
          ctx.data({
            orders: {
              __typename: 'OrderQueryResult',
              results: pageOf(
                offset === 0 ? PAGE : 7,
                (i) => ({ __typename: 'Order', id: `o${i}`, lineItems: [] }),
                offset
              ),
            },
          })
        );
      })
    );
    const result = await createApi().fetchRecentOrders(
      '2026-07-01T00:00:00.000Z'
    );
    expect(count).toBe(2);
    expect(result.orders).toHaveLength(PAGE + 7);
    expect(result.truncated).toBe(false);
  });

  it('pages the discount groups by 500 and returns them as LookDiscountGroups', async () => {
    const offsets: number[] = [];
    server.use(
      graphql.query('FetchLookDiscountGroups', (req, res, ctx) => {
        const { offset } = req.variables as { offset: number };
        offsets.push(offset);
        return res(
          ctx.data({
            discountGroups: {
              __typename: 'DiscountGroupQueryResult',
              results: pageOf(offset === 0 ? PAGE : 1, rawGroup, offset),
            },
          })
        );
      })
    );
    const groups = await createApi().fetchDiscountGroups();
    expect(groups).toHaveLength(PAGE + 1);
    expect(offsets).toEqual([0, PAGE]);
    expect(groups[0]).toMatchObject({
      id: 'g0',
      version: 2,
      key: 'look-k0',
      sortOrder: '0.7',
      isActive: false,
    });
  });

  it('reads one discount group by key, undefined when there is none', async () => {
    const variables: unknown[] = [];
    server.use(
      graphql.query('FetchLookDiscountGroup', (req, res, ctx) => {
        variables.push(req.variables);
        const { key } = req.variables as { key: string };
        return res(
          ctx.data({
            discountGroup: key === 'look-k1' ? rawGroup(1) : null,
          })
        );
      })
    );
    const api = createApi();
    expect(await api.getDiscountGroupByKey('look-k1')).toMatchObject({
      id: 'g1',
      key: 'look-k1',
    });
    expect(await api.getDiscountGroupByKey('look-none')).toBeUndefined();
    expect(variables).toEqual([{ key: 'look-k1' }, { key: 'look-none' }]);
  });

  it('sends the draft of CreateLookDiscountGroup and returns the group', async () => {
    let received: unknown;
    server.use(
      graphql.mutation('CreateLookDiscountGroup', (req, res, ctx) => {
        received = req.variables;
        return res(
          ctx.data({ createDiscountGroup: rawGroup(1, { version: 1 }) })
        );
      })
    );
    const draft = {
      key: 'look-k1',
      sortOrder: '0.7',
      name: [{ locale: 'de', value: 'Look-Set: Büro' }],
      isActive: false,
    };
    const created = await createApi().createDiscountGroup(draft);
    expect(received).toEqual({ draft });
    expect(created).toMatchObject({ id: 'g1', version: 1, key: 'look-k1' });
  });

  it('sends id, version and actions for UpdateLookDiscountGroup', async () => {
    let received: unknown;
    server.use(
      graphql.mutation('UpdateLookDiscountGroup', (req, res, ctx) => {
        received = req.variables;
        return res(
          ctx.data({
            updateDiscountGroup: rawGroup(1, { isActive: true, version: 3 }),
          })
        );
      })
    );
    const actions = [{ setIsActive: { isActive: true } }];
    const updated = await createApi().updateDiscountGroup(
      'g1',
      2,
      actions,
      'switchDiscountGroup'
    );
    expect(received).toEqual({ id: 'g1', version: 2, actions });
    expect(updated).toMatchObject({ isActive: true, version: 3 });
  });

  it('maps a failed group create (duplicate key or rank) to a duplicate LookApiError', async () => {
    server.use(
      graphql.mutation('CreateLookDiscountGroup', (_req, res, ctx) =>
        res(
          ctx.errors([
            {
              message: 'duplicate',
              extensions: { code: 'DuplicateField' },
            },
          ])
        )
      )
    );
    const error = await createApi()
      .createDiscountGroup({
        key: 'look-k1',
        sortOrder: '0.7',
        name: [],
        isActive: false,
      })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LookApiError);
    expect(error).toMatchObject({
      kind: 'duplicate',
      operation: 'createDiscountGroup',
    });
  });

  it('maps ConcurrentModification on a group switch to a conflict naming switchDiscountGroup', async () => {
    server.use(
      graphql.mutation('UpdateLookDiscountGroup', (_req, res, ctx) =>
        res(
          ctx.errors([
            {
              message: 'different version',
              extensions: { code: 'ConcurrentModification' },
            },
          ])
        )
      )
    );
    const error = await createApi()
      .updateDiscountGroup(
        'g1',
        1,
        [{ setIsActive: { isActive: true } }],
        'switchDiscountGroup'
      )
      .catch((e: unknown) => e);
    expect(error).toMatchObject({
      kind: 'conflict',
      operation: 'switchDiscountGroup',
      statusCode: 409,
    });
  });

  it('maps a failed group read to a LookApiError of readLooks', async () => {
    server.use(
      graphql.query('FetchLookDiscountGroup', (_req, res, ctx) =>
        res(
          ctx.errors([
            { message: 'no scope', extensions: { code: 'InsufficientScope' } },
          ])
        )
      )
    );
    await expect(
      createApi().getDiscountGroupByKey('look-k1')
    ).rejects.toMatchObject({ kind: 'forbidden', operation: 'readLooks' });
  });

  it('maps ConcurrentModification to a conflict LookApiError naming the operation', async () => {
    server.use(
      graphql.mutation('UpdateLookDiscount', (_req, res, ctx) =>
        res(
          ctx.errors([
            {
              message: 'Object has a different version',
              extensions: { code: 'ConcurrentModification' },
            },
          ])
        )
      )
    );
    const error = await createApi()
      .updateCartDiscount(
        'd1',
        1,
        [{ changeIsActive: { isActive: true } }],
        'switchDiscount'
      )
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LookApiError);
    expect(error).toMatchObject({
      kind: 'conflict',
      operation: 'switchDiscount',
      statusCode: 409,
    });
  });

  it('maps a failed read to a LookApiError of the read operation', async () => {
    server.use(
      graphql.query('FetchLookObjects', (_req, res, ctx) =>
        res(
          ctx.errors([
            { message: 'no scope', extensions: { code: 'InsufficientScope' } },
          ])
        )
      )
    );
    await expect(createApi().fetchLookObjects()).rejects.toMatchObject({
      kind: 'forbidden',
      operation: 'readLooks',
    });
  });

  describe('searchPieces', () => {
    const product = (id: string) => ({
      __typename: 'ProductSearchResult',
      id,
      product: {
        __typename: 'Product',
        id,
        masterData: {
          __typename: 'ProductCatalogData',
          current: {
            __typename: 'ProductData',
            name: `Product ${id}`,
            masterVariant: {
              __typename: 'ProductVariant',
              sku: `${id}-1`,
              images: [],
              prices: [],
              attributesRaw: [],
              availability: null,
            },
            variants: [],
          },
        },
      },
    });

    it('searches name and SKU together', async () => {
      const queries: unknown[] = [];
      server.use(
        graphql.query('SearchPieces', (req, res, ctx) => {
          queries.push(req.variables.query);
          return res(
            ctx.data({ productsSearch: { total: 1, results: [product('a')] } })
          );
        })
      );
      const found = await createApi().searchPieces('mpc-02');
      expect(found.pieces.map((piece) => piece.id)).toEqual(['a']);
      expect(queries).toHaveLength(1);
      const fields = (
        queries[0] as { or: Array<{ wildcard: { field: string } }> }
      ).or.map((clause) => clause.wildcard.field);
      expect(fields).toEqual([
        'name',
        'description',
        'slug',
        'searchKeywords',
        'key',
        'id',
        'variants.sku',
      ]);
    });

    it('does not search again when the failure is a missing permission', async () => {
      let calls = 0;
      server.use(
        graphql.query('SearchPieces', (_req, res, ctx) => {
          calls += 1;
          return res(
            ctx.errors([
              {
                message: 'no scope',
                extensions: { code: 'InsufficientScope' },
              },
            ])
          );
        })
      );
      await expect(createApi().searchPieces('maya')).rejects.toMatchObject({
        kind: 'forbidden',
        operation: 'searchProducts',
      });
      expect(calls).toBe(1);
    });
  });

  describe('delete', () => {
    const capture = (name: string, field: string) => {
      const received: unknown[] = [];
      server.use(
        graphql.mutation(name, (req, res, ctx) => {
          received.push(req.variables);
          return res(ctx.data({ [field]: { id: 'x' } }));
        })
      );
      return received;
    };
    const conflict = (name: string) =>
      server.use(
        graphql.mutation(name, (_req, res, ctx) =>
          res(
            ctx.errors([
              {
                message: 'different version',
                extensions: { code: 'ConcurrentModification' },
              },
            ])
          )
        )
      );

    it('deletes a Cart Discount with id and version', async () => {
      const received = capture('DeleteLookDiscount', 'deleteCartDiscount');
      await createApi().deleteCartDiscount('d1', 4);
      expect(received).toEqual([{ id: 'd1', version: 4 }]);
    });

    it('deletes a Discount Group with id and version', async () => {
      const received = capture(
        'DeleteLookDiscountGroup',
        'deleteDiscountGroup'
      );
      await createApi().deleteDiscountGroup('g1', 5);
      expect(received).toEqual([{ id: 'g1', version: 5 }]);
    });

    it('deletes the look object by container, key and version', async () => {
      const received = capture('DeleteLookObject', 'deleteCustomObject');
      await createApi().deleteLookObject('look-k1', 3);
      expect(received).toEqual([
        { container: 'look', key: 'look-k1', version: 3 },
      ]);
    });

    it.each([
      [
        'DeleteLookDiscount',
        (api: ReturnType<typeof createApi>) => api.deleteCartDiscount('d1', 1),
      ],
      [
        'DeleteLookDiscountGroup',
        (api: ReturnType<typeof createApi>) => api.deleteDiscountGroup('g1', 1),
      ],
      [
        'DeleteLookObject',
        (api: ReturnType<typeof createApi>) =>
          api.deleteLookObject('look-k1', 1),
      ],
    ])(
      'maps ConcurrentModification of %s to a conflict of deleteLook',
      async (name, run) => {
        conflict(name);
        const error = await run(createApi()).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(LookApiError);
        expect(error).toMatchObject({
          kind: 'conflict',
          operation: 'deleteLook',
          statusCode: 409,
        });
      }
    );
  });
});
