import type { LookDiscount, LookObject, Piece } from '../domain/types';
import { buildDiscount, buildObject, buildPiece } from './fixtures';

export const PIECE_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];

export const pieces = (): Piece[] => PIECE_IDS.map((id) => buildPiece(id));

/** A complete look: object and discount with the same key and pieces. Piece
 *  prices are 100,00 EUR each, so a two-piece look sums to 200,00 EUR. */
export function buildLook(
  key: string,
  name: string,
  pieceIds: string[] = ['p1', 'p2'],
  options: {
    active?: boolean;
    setPrice?: Record<string, number>;
    endedAt?: string;
    createdAt?: string;
    image?: LookObject['value']['image'];
    withoutObject?: boolean;
  } = {}
): { objects: LookObject[]; discounts: LookDiscount[] } {
  const setPrice = options.setPrice ?? { EUR: 18000, CHF: 19800 };
  const amount = {
    EUR: pieceIds.length * 10000 - setPrice.EUR,
    CHF: pieceIds.length * 11000 - setPrice.CHF,
  };
  return {
    objects: options.withoutObject
      ? []
      : [
          buildObject(key, pieceIds, {
            setPrice,
            ...(options.endedAt ? { endedAt: options.endedAt } : {}),
            ...(options.image ? { image: options.image } : {}),
          }),
        ],
    discounts: [
      buildDiscount(key, pieceIds, {
        isActive: options.active ?? true,
        name: { de: `Look-Set: ${name}`, en: `Look set: ${name}` },
        description: { de: name, en: name },
        amount,
        ...(options.createdAt ? { createdAt: options.createdAt } : {}),
      }),
    ],
  };
}

export function buildLooks(looks: Array<ReturnType<typeof buildLook>>): {
  objects: LookObject[];
  discounts: LookDiscount[];
} {
  return {
    objects: looks.flatMap((look) => look.objects),
    discounts: looks.flatMap((look) => look.discounts),
  };
}
