import { buildPieceSearchQuery } from './search-query';

describe('buildPieceSearchQuery', () => {
  it('lists products that have a name for an empty text', () => {
    expect(buildPieceSearchQuery('  ', 'de-DE')).toEqual({
      exists: { field: 'name', language: 'de-DE' },
    });
  });

  it('matches name, description, slug, search keywords, key, product id and SKU', () => {
    const query = buildPieceSearchQuery(' 6bfc ', 'de-DE') as {
      or: Array<{
        wildcard: {
          field: string;
          value: string;
          caseInsensitive: boolean;
          language?: string;
        };
      }>;
    };
    expect(
      query.or.map(({ wildcard }) => [wildcard.field, wildcard.language])
    ).toEqual([
      ['name', 'de-DE'],
      ['description', 'de-DE'],
      ['slug', 'de-DE'],
      ['searchKeywords', 'de-DE'],
      ['key', undefined],
      ['id', undefined],
      ['variants.sku', undefined],
    ]);
    for (const { wildcard } of query.or) {
      expect(wildcard.value).toBe('*6bfc*');
      expect(wildcard.caseInsensitive).toBe(true);
    }
  });

  it('does not search the meta fields, which the product search does not know', () => {
    const fields = JSON.stringify(buildPieceSearchQuery('x', 'de-DE'));
    expect(fields).not.toMatch(/meta/i);
  });
});
