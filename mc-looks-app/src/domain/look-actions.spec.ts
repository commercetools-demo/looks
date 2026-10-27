import {
  buildLookCartDiscountDraft,
  changeIsActiveAction,
  changeValueAction,
  discountAmounts,
  nameActions,
} from './look-actions';

const look = {
  key: 'cozy-in-grey',
  label: { de: 'Cozy in Grey', en: 'Cozy in Grey' },
  componentProductIds: ['p1', 'p2', 'p3'],
  setPrice: { EUR: 26590, CHF: 29290 },
  sum: { EUR: 29596, CHF: 32590 },
};

describe('look actions', () => {
  it('computes live sum minus set price per currency', () => {
    expect(discountAmounts(look.sum, look.setPrice)).toEqual({
      EUR: 3006,
      CHF: 3300,
    });
  });

  it('builds the set-price discount draft', () => {
    const draft = buildLookCartDiscountDraft(look, {
      sortOrder: '0.7',
      isActive: false,
    });
    expect(draft).toMatchObject({
      key: 'look-cozy-in-grey',
      cartPredicate: 'true',
      sortOrder: '0.7',
      isActive: false,
      requiresDiscountCode: false,
      stores: [],
      name: [
        { locale: 'de', value: 'Look-Set: Cozy in Grey' },
        { locale: 'en', value: 'Look set: Cozy in Grey' },
      ],
      value: {
        absoluteCart: {
          applicationMode: 'ProportionateDistribution',
          money: [
            { currencyCode: 'EUR', centAmount: 3006 },
            { currencyCode: 'CHF', centAmount: 3300 },
          ],
        },
      },
    });
    expect(draft.target.pattern.triggerPattern).toEqual([]);
    expect(draft.target.pattern.targetPattern).toEqual(
      ['p1', 'p2', 'p3'].map((id) => ({
        CountOnLineItemUnits: {
          predicate: `product.id = "${id}"`,
          minCount: 1,
          maxCount: 1,
        },
      }))
    );
    expect(draft.target.pattern.selectionMode).toBe('Cheapest');
  });

  it('builds update actions', () => {
    expect(changeIsActiveAction(true)).toEqual({
      changeIsActive: { isActive: true },
    });
    expect(changeValueAction(look.sum, look.setPrice)).toMatchObject({
      changeValue: {
        value: {
          absoluteCart: { applicationMode: 'ProportionateDistribution' },
        },
      },
    });
    expect(nameActions({ de: 'A', en: 'B' })).toHaveLength(2);
  });
});
