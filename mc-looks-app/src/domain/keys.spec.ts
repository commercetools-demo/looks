/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  deriveLookKey,
  isCountryDiscountKey,
  isValidLookKey,
  keySourceName,
  lookDiscountKey,
  lookKeyFromDiscountKey,
  lookKeyFromObjectKey,
  lookObjectKey,
  slugify,
} from './keys';

describe('keys', () => {
  it('builds and reads object keys', () => {
    expect(lookObjectKey('cozy-in-grey')).toBe('look-cozy-in-grey');
    expect(lookKeyFromObjectKey('look-cozy-in-grey')).toBe('cozy-in-grey');
    expect(lookKeyFromObjectKey('other-key')).toBeUndefined();
    expect(lookKeyFromObjectKey('look-')).toBeUndefined();
    expect(lookKeyFromObjectKey(undefined)).toBeUndefined();
  });

  it('slugifies with umlauts and accents', () => {
    expect(slugify('Mühelos in Warm Greige')).toBe('muehelos-in-warm-greige');
    expect(slugify('  Straße & Café!! ')).toBe('strasse-cafe');
  });

  it('derives a key from the English name and avoids taken keys', () => {
    expect(deriveLookKey('Cozy in Grey', new Set())).toBe('cozy-in-grey');
    expect(deriveLookKey('Cozy in Grey', new Set(['cozy-in-grey']))).toBe(
      'cozy-in-grey-2'
    );
    expect(
      deriveLookKey('Cozy in Grey', new Set(['cozy-in-grey', 'cozy-in-grey-2']))
    ).toBe('cozy-in-grey-3');
  });

  it('falls back to "look" for names without ASCII characters', () => {
    expect(deriveLookKey('!!!', new Set())).toBe('look');
  });

  it('keeps keys at 40 characters including the suffix', () => {
    const long = 'a'.repeat(60);
    expect(deriveLookKey(long, new Set()).length).toBe(40);
    const second = deriveLookKey(long, new Set(['a'.repeat(40)]));
    expect(second.length).toBeLessThanOrEqual(40);
    expect(second.endsWith('-2')).toBe(true);
  });

  it('produces keys that satisfy the shared key rule with the prefix', () => {
    const key = lookObjectKey(deriveLookKey('Ton-in-Ton-Look', new Set()));
    expect(key).toMatch(/^[a-zA-Z0-9-_]{2,256}$/);
  });

  it('derives the key from the English name, else the German one, else the first translation', () => {
    expect(keySourceName({ de: 'Kontrast', en: 'Contrast' })).toBe('Contrast');
    expect(keySourceName({ de: 'Kontrast', 'en-GB': 'Contrast' })).toBe(
      'Contrast'
    );
    expect(keySourceName({ de: 'Kontrast', fr: 'Contraste' })).toBe('Kontrast');
    expect(keySourceName({ fr: 'Contraste', it: 'Contrasto' })).toBe(
      'Contraste'
    );
    expect(keySourceName({ de: ' ', fr: 'Contraste' })).toBe('Contraste');
    expect(keySourceName({})).toBe('');
  });

  it('accepts a chosen key by the shared key rule (letters, digits, - and _, trimmed)', () => {
    expect(isValidLookKey('cozy-in-grey')).toBe(true);
    expect(isValidLookKey('  Winter_2026-A  ')).toBe(true);
    expect(isValidLookKey('')).toBe(false);
    expect(isValidLookKey('   ')).toBe(false);
    expect(isValidLookKey('has space')).toBe(false);
    expect(isValidLookKey('ümlaut')).toBe(false);
    expect(isValidLookKey('a/b')).toBe(false);
    expect(isValidLookKey('a'.repeat(251))).toBe(true);
    expect(isValidLookKey('a'.repeat(252))).toBe(false);
  });
});

describe('country discount keys', () => {
  it('keys the main discount look-<key> and the others by country', () => {
    expect(lookDiscountKey('cozy', 'DE', true)).toBe('look-cozy');
    expect(lookDiscountKey('cozy', '', true)).toBe('look-cozy');
    expect(lookDiscountKey('cozy', 'FR', false)).toBe('look-cozy-FR');
    expect(lookDiscountKey('cozy', '', false)).toBe('look-cozy-ALL');
  });

  it('reads the look key from a main or country discount key', () => {
    expect(lookKeyFromDiscountKey('look-cozy')).toBe('cozy');
    expect(lookKeyFromDiscountKey('look-cozy-DE')).toBe('cozy');
    expect(lookKeyFromDiscountKey('look-cozy-ALL')).toBe('cozy');
    expect(lookKeyFromDiscountKey('look-cozy-in-grey')).toBe('cozy-in-grey');
    expect(lookKeyFromDiscountKey('look-cozy-in-grey-GB')).toBe('cozy-in-grey');
    expect(lookKeyFromDiscountKey('promo-1')).toBeUndefined();
    expect(lookKeyFromDiscountKey(undefined)).toBeUndefined();
  });

  it('tells country discounts from main ones', () => {
    expect(isCountryDiscountKey('look-cozy-DE')).toBe(true);
    expect(isCountryDiscountKey('look-cozy-ALL')).toBe(true);
    expect(isCountryDiscountKey('look-cozy')).toBe(false);
    expect(isCountryDiscountKey('look-cozy-de')).toBe(false);
    expect(isCountryDiscountKey('promo-DE')).toBe(false);
  });

  it('rejects chosen look keys that end like a country discount key', () => {
    expect(isValidLookKey('winter-DE')).toBe(false);
    expect(isValidLookKey('winter-ALL')).toBe(false);
    expect(isValidLookKey('winter-de')).toBe(true);
    expect(isValidLookKey('winter-DEU')).toBe(true);
    expect(isValidLookKey('winter-2026')).toBe(true);
  });
});
