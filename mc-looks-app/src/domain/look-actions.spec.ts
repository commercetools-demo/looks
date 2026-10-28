import {
  buildCountryDiscountDraft,
  buildDiscountValueInput,
  buildLookCartDiscountDrafts,
  buildLookDiscountGroupDraft,
  changeIsActiveAction,
  changeValueAction,
  countryPredicate,
  groupAmounts,
  groupPriceKeys,
  nameActions,
  setGroupActiveAction,
} from './look-actions';

const look = {
  key: 'cozy-in-grey',
  label: { de: 'Cozy in Grey', en: 'Cozy in Grey' },
  componentProductIds: ['p1', 'p2', 'p3'],
  setPrice: { 'EUR/DE': 26590, 'EUR/FR': 20000, 'GBP/GB': 28000 },
  sum: { 'EUR/DE': 29596, 'EUR/FR': 23000, 'GBP/GB': 31990 },
};

describe('price groups', () => {
  it('groups cells by country in order of appearance', () => {
    expect(groupPriceKeys(['EUR/DE', 'GBP/GB', 'CHF/DE', 'USD'])).toEqual([
      { country: 'DE', keys: ['EUR/DE', 'CHF/DE'] },
      { country: 'GB', keys: ['GBP/GB'] },
      { country: '', keys: ['USD'] },
    ]);
    expect(groupPriceKeys([])).toEqual([]);
  });

  it('computes live sum minus set price per currency of a group', () => {
    expect(
      groupAmounts(
        { country: 'DE', keys: ['EUR/DE', 'CHF/DE'] },
        { 'EUR/DE': 29596, 'CHF/DE': 32590 },
        { 'EUR/DE': 26590, 'CHF/DE': 29290 }
      )
    ).toEqual({ EUR: 3006, CHF: 3300 });
  });

  it('writes the cart predicate of a country or of no country', () => {
    expect(countryPredicate('DE')).toBe('country = "DE"');
    expect(countryPredicate('')).toBe('country is not defined');
  });
});

describe('look actions', () => {
  it('builds the value input from amounts per currency', () => {
    expect(buildDiscountValueInput({ EUR: 3006, CHF: 3300 })).toEqual({
      absoluteCart: {
        applicationMode: 'ProportionateDistribution',
        money: [
          { currencyCode: 'EUR', centAmount: 3006 },
          { currencyCode: 'CHF', centAmount: 3300 },
        ],
      },
    });
  });

  it('builds one discount draft per country, the first being the main one', () => {
    const drafts = buildLookCartDiscountDrafts(look, {
      isActive: false,
    });
    expect(drafts.map((d) => d.key)).toEqual([
      'look-cozy-in-grey',
      'look-cozy-in-grey-FR',
      'look-cozy-in-grey-GB',
    ]);
    expect(drafts.map((d) => d.cartPredicate)).toEqual([
      'country = "DE"',
      'country = "FR"',
      'country = "GB"',
    ]);
    expect(drafts.map((d) => d.discountGroup)).toEqual(
      Array(3).fill({ typeId: 'discount-group', key: 'look-cozy-in-grey' })
    );
    expect(drafts.some((d) => 'sortOrder' in d)).toBe(false);
    expect(drafts.map((d) => d.value.absoluteCart.money)).toEqual([
      [{ currencyCode: 'EUR', centAmount: 3006 }],
      [{ currencyCode: 'EUR', centAmount: 3000 }],
      [{ currencyCode: 'GBP', centAmount: 3990 }],
    ]);
  });

  it('builds the set-price discount draft', () => {
    const [draft] = buildLookCartDiscountDrafts(look, {
      isActive: false,
    });
    expect(draft).toMatchObject({
      key: 'look-cozy-in-grey',
      isActive: false,
      requiresDiscountCode: false,
      stores: [],
      name: [
        { locale: 'de', value: 'Look-Set: Cozy in Grey' },
        { locale: 'en', value: 'Look set: Cozy in Grey' },
      ],
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

  it('puts several currencies of one country in one discount', () => {
    const [draft] = buildLookCartDiscountDrafts(
      {
        ...look,
        setPrice: { 'EUR/DE': 26590, 'CHF/DE': 29290 },
        sum: { 'EUR/DE': 29596, 'CHF/DE': 32590 },
      },
      { isActive: true }
    );
    expect(draft.isActive).toBe(true);
    expect(draft.value.absoluteCart.money).toEqual([
      { currencyCode: 'EUR', centAmount: 3006 },
      { currencyCode: 'CHF', centAmount: 3300 },
    ]);
  });

  it('keys a country discount look-<key>-<country> and ALL for no country', () => {
    const draft = (country: string) =>
      buildCountryDiscountDraft(
        look,
        { country, keys: [country ? `EUR/${country}` : 'EUR'] },
        { isActive: false, isMain: false }
      );
    expect(draft('DE').key).toBe('look-cozy-in-grey-DE');
    expect(draft('').key).toBe('look-cozy-in-grey-ALL');
    expect(draft('').cartPredicate).toBe('country is not defined');
  });

  it('builds the look discount group draft', () => {
    expect(
      buildLookDiscountGroupDraft(look, { sortOrder: '0.7', isActive: false })
    ).toEqual({
      key: 'look-cozy-in-grey',
      sortOrder: '0.7',
      isActive: false,
      name: [
        { locale: 'de', value: 'Cozy in Grey' },
        { locale: 'en', value: 'Cozy in Grey' },
      ],
    });
    expect(setGroupActiveAction(true)).toEqual({
      setIsActive: { isActive: true },
    });
  });

  it('gives the group the plain name and the description only when there is one', () => {
    const options = { sortOrder: '0.7', isActive: false };
    const withDescription = buildLookDiscountGroupDraft(
      {
        ...look,
        label: { de: 'Kontrast', en: '' },
        description: { de: 'Beschreibung', en: '', fr: 'Description' },
      },
      options
    );
    expect(withDescription.name).toEqual([{ locale: 'de', value: 'Kontrast' }]);
    expect(withDescription.description).toEqual([
      { locale: 'de', value: 'Beschreibung' },
      { locale: 'fr', value: 'Description' },
    ]);
    for (const description of [undefined, {}, { de: '' }] as Array<
      Record<string, string> | undefined
    >) {
      const draft = buildLookDiscountGroupDraft(
        { ...look, description },
        options
      );
      expect(draft).not.toHaveProperty('description');
    }
  });

  it('references the group from the main and country discounts', () => {
    const draft = buildCountryDiscountDraft(
      look,
      { country: 'FR', keys: ['EUR/FR'] },
      { isActive: false, isMain: false }
    );
    expect(draft.discountGroup).toEqual({
      typeId: 'discount-group',
      key: 'look-cozy-in-grey',
    });
    expect('sortOrder' in draft).toBe(false);
  });

  it('builds update actions', () => {
    expect(changeIsActiveAction(true)).toEqual({
      changeIsActive: { isActive: true },
    });
    expect(changeValueAction({ EUR: 3006 })).toEqual({
      changeValue: {
        value: {
          absoluteCart: {
            applicationMode: 'ProportionateDistribution',
            money: [{ currencyCode: 'EUR', centAmount: 3006 }],
          },
        },
      },
    });
    expect(nameActions({ de: 'A', en: 'B' })).toHaveLength(2);
  });
});
