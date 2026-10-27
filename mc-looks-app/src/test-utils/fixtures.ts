import type { LookDiscount, LookObject, Piece } from '../domain/types';

export const CURRENCIES = ['EUR', 'CHF'];
export const LANGUAGES = ['de', 'en'];

/** A piece with EUR and CHF prices unless given. */
export function buildPiece(id: string, overrides: Partial<Piece> = {}): Piece {
  const prices = overrides.prices ?? { EUR: 10000, CHF: 11000 };
  return {
    id,
    name: `Piece ${id}`,
    imageUrl: `https://img.example.com/${id}.jpg`,
    colour: 'braun',
    prices,
    sizes: [
      { sku: `${id}-36`, label: '36', availableQuantity: 5 },
      { sku: `${id}-38`, label: '38', availableQuantity: 2 },
    ],
    oneSize: false,
    soldOutEverywhere: false,
    ...overrides,
  };
}

export function buildObject(
  lookKey: string,
  pieceIds: string[],
  overrides: Partial<LookObject['value']> = {}
): LookObject {
  return {
    id: `obj-${lookKey}`,
    version: 1,
    key: `look-${lookKey}`,
    value: {
      componentProductIds: pieceIds,
      setPrice: { EUR: 18000, CHF: 19800 },
      ...overrides,
    },
  };
}

export function buildDiscount(
  lookKey: string,
  pieceIds: string[],
  overrides: Partial<LookDiscount> = {}
): LookDiscount {
  return {
    id: `disc-${lookKey}`,
    version: 1,
    key: `look-${lookKey}`,
    isActive: true,
    sortOrder: '0.7',
    createdAt: '2026-09-30T08:00:00.000Z',
    name: { de: `Look-Set: ${lookKey} de`, en: `Look set: ${lookKey} en` },
    description: { de: `${lookKey} de`, en: `${lookKey} en` },
    amount: { EUR: 2000, CHF: 2200 },
    country: '',
    pieceIds,
    ...overrides,
  };
}
