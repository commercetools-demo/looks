import {
  deriveLookKey,
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
});
