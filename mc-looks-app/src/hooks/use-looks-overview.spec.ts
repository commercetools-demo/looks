import { buildLookRows } from '../domain/look-rows';
import {
  buildDiscount,
  buildObject,
  buildPiece,
  CURRENCIES,
} from '../test-utils/fixtures';
import {
  parseListQuery,
  piecesToLoad,
  writeListQuery,
} from './use-looks-overview';

const rowsOf = (
  looks: Array<{ key: string; ids: string[]; active: boolean }>
) =>
  buildLookRows({
    objects: looks.map((look) => buildObject(look.key, look.ids)),
    discounts: looks.map((look) =>
      buildDiscount(look.key, look.ids, { isActive: look.active })
    ),
    pieces: new Map(),
    currencies: CURRENCIES,
  });

describe('parseListQuery', () => {
  it('uses the defaults for an empty query', () => {
    expect(parseListQuery('')).toEqual({
      page: 1,
      size: 20,
      sort: { key: 'name', direction: 'asc' },
      q: '',
    });
  });

  it('reads page, size, sort, direction and search', () => {
    expect(
      parseListQuery('?page=3&size=50&sort=sum&dir=desc&q=b%C3%BCro')
    ).toEqual({
      page: 3,
      size: 50,
      sort: { key: 'sum', direction: 'desc' },
      q: 'büro',
    });
  });

  it('falls back to the defaults for values it does not know', () => {
    expect(parseListQuery('?page=-2&size=33&sort=colour&dir=sideways')).toEqual(
      parseListQuery('')
    );
    expect(parseListQuery('?page=abc').page).toBe(1);
  });
});

describe('writeListQuery', () => {
  it('omits the defaults', () => {
    expect(writeListQuery('', parseListQuery(''))).toBe('');
  });

  it('round-trips a non-default state', () => {
    const query = {
      page: 2,
      size: 100,
      sort: { key: 'status' as const, direction: 'desc' as const },
      q: 'kleid',
    };
    expect(parseListQuery(writeListQuery('', query))).toEqual(query);
  });

  it('keeps other parameters and drops the ones that return to the defaults', () => {
    expect(
      writeListQuery('?foo=1&page=4&q=x', { ...parseListQuery(''), q: '' })
    ).toBe('?foo=1');
  });
});

describe('piecesToLoad', () => {
  const allRows = rowsOf([
    { key: 'a', ids: ['p1', 'p2'], active: true },
    { key: 'b', ids: ['p2', 'p3'], active: true },
    { key: 'c', ids: ['p4', 'p5'], active: false },
  ]);

  it('loads the visible page and the past looks first', () => {
    expect(
      piecesToLoad({ sortKey: 'name', allRows, pageRows: [allRows[0]] })
    ).toEqual(['p1', 'p2', 'p4', 'p5']);
  });

  it.each(['sum', 'saving'] as const)(
    'loads every piece when sorting by %s',
    (sortKey) => {
      expect(
        piecesToLoad({ sortKey, allRows, pageRows: [allRows[0]] })
      ).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    }
  );

  it('ignores piece data that is already part of a row', () => {
    expect(buildPiece('p1').id).toBe('p1');
    expect(
      piecesToLoad({ sortKey: 'name', allRows: [], pageRows: [] })
    ).toEqual([]);
  });
});
