/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  buildLookDescription,
  buildLookDiscountName,
  lookNameFromDiscount,
  lookNameFromSetName,
  omitEmptyTranslations,
} from './names';

describe('names', () => {
  it('builds readable discount names without a brand', () => {
    expect(
      buildLookDiscountName({ de: 'Kontrast-Look', en: 'Contrast look' })
    ).toEqual({
      de: 'Look-Set: Kontrast-Look',
      en: 'Look set: Contrast look',
    });
    expect(buildLookDescription({ de: 'A', en: 'B' })).toEqual({
      de: 'A',
      en: 'B',
    });
  });

  it('reads the look name from the set name form', () => {
    expect(lookNameFromSetName('Look-Set: Cozy in Grey')).toBe('Cozy in Grey');
    expect(lookNameFromSetName('Look set: Cozy')).toBe('Cozy');
    expect(lookNameFromSetName('Something else')).toBeUndefined();
  });

  it('reads both name forms, falling back to the description', () => {
    expect(
      lookNameFromDiscount({
        name: { de: 'Look-Set: Cozy in Grey' },
        description: { de: 'Cozy in Grey' },
      })
    ).toEqual({ de: 'Cozy in Grey' });
    expect(
      lookNameFromDiscount({
        name: { de: 'Anything' },
        description: { de: 'Jacken-Set' },
      })
    ).toEqual({
      de: 'Jacken-Set',
    });
    expect(lookNameFromDiscount(undefined)).toBeUndefined();
    expect(lookNameFromDiscount({ name: {}, description: {} })).toBeUndefined();
  });

  it('names the discount in every filled project language, dropping empty translations', () => {
    expect(
      buildLookDiscountName({
        de: 'Kontrast',
        en: 'Contrast',
        fr: ' ',
        'de-AT': 'Kontrast AT',
        it: 'Contrasto',
      })
    ).toEqual({
      de: 'Look-Set: Kontrast',
      en: 'Look set: Contrast',
      'de-AT': 'Look-Set: Kontrast AT',
      it: 'Look set: Contrasto',
    });
    expect(buildLookDescription({ de: ' x ', en: '' })).toEqual({ de: 'x' });
    expect(omitEmptyTranslations({ de: ' ', en: 'a' })).toEqual({ en: 'a' });
  });

  it('reads the name of a language with the English prefix back', () => {
    expect(
      lookNameFromDiscount({ name: { it: 'Look set: Contrasto' } })
    ).toEqual({ it: 'Contrasto' });
  });
});
