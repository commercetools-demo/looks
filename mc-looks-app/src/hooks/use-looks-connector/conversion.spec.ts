import { countryOfPredicate, toLookDiscount, toLookObject } from './conversion';
import { buildLookValue } from '../../domain/look-value';

describe('countryOfPredicate', () => {
  it('reads the country of a country predicate', () => {
    expect(countryOfPredicate('country = "DE"')).toBe('DE');
    expect(countryOfPredicate('  country="GB" ')).toBe('GB');
  });

  it('means no country for true, an unset predicate and "country is not defined"', () => {
    expect(countryOfPredicate('true')).toBe('');
    expect(countryOfPredicate('country is not defined')).toBe('');
    expect(countryOfPredicate(undefined)).toBe('');
    expect(countryOfPredicate(null)).toBe('');
  });

  it('returns undefined for conditions the app did not write', () => {
    expect(countryOfPredicate('country = "de"')).toBeUndefined();
    expect(countryOfPredicate('country in ("DE", "FR")')).toBeUndefined();
    expect(countryOfPredicate('customer.email is defined')).toBeUndefined();
  });
});

describe('toLookDiscount', () => {
  it('carries the country of the cart predicate', () => {
    const raw = {
      id: 'd',
      version: 1,
      key: 'look-x-FR',
      isActive: true,
      sortOrder: '0.7001',
      createdAt: '2026-10-01T00:00:00.000Z',
      cartPredicate: 'country = "FR"',
      value: {
        type: 'absoluteCart',
        money: [{ currencyCode: 'EUR', centAmount: 639 }],
      },
    };
    expect(toLookDiscount(raw)).toMatchObject({
      country: 'FR',
      amount: { EUR: 639 },
    });
    expect(toLookDiscount({ ...raw, cartPredicate: 'true' }).country).toBe('');
  });
});

describe('toLookObject', () => {
  it('still reads an object that carries a legacy image field, and rewriting drops it', () => {
    const object = toLookObject({
      id: 'o1',
      version: 3,
      key: 'look-a',
      value: {
        componentProductIds: ['p1', 'p2'],
        setPrice: { EUR: 18000 },
        image: { path: 'looks/a.webp', width: 800, height: 1200 },
      },
    } as never);
    expect(object?.value.componentProductIds).toEqual(['p1', 'p2']);
    expect(object?.value.setPrice).toEqual({ EUR: 18000 });
    expect(buildLookValue(object!.value)).not.toHaveProperty('image');
  });
});
