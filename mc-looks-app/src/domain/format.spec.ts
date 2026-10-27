import {
  formatMoney,
  localeChain,
  localized,
  toLocalizedRecord,
} from './format';

describe('format', () => {
  it('builds the locale chain data locale, de, en', () => {
    expect(localeChain('fr')).toEqual(['fr', 'de', 'en']);
    expect(localeChain('de')).toEqual(['de', 'en']);
    expect(localeChain(undefined)).toEqual(['de', 'en']);
  });

  it('reads a localized value with fallback de, en, first', () => {
    expect(localized({ de: 'Hallo', en: 'Hello' }, 'en')).toBe('Hello');
    expect(localized({ de: 'Hallo', en: 'Hello' }, 'fr')).toBe('Hallo');
    expect(localized({ en: 'Hello' }, 'fr')).toBe('Hello');
    expect(localized({ it: 'Ciao' }, 'fr')).toBe('Ciao');
    expect(localized({}, 'de')).toBeUndefined();
    expect(localized(undefined, 'de')).toBeUndefined();
  });

  it('formats cent amounts', () => {
    expect(formatMoney(26590, 'EUR', 'de-DE')).toContain('265,90');
    expect(formatMoney(100, 'CHF', 'de-DE')).toContain('1,00');
  });

  it('converts GraphQL localized entries', () => {
    expect(
      toLocalizedRecord([
        { locale: 'de', value: 'a' },
        { locale: 'en', value: 'b' },
      ])
    ).toEqual({ de: 'a', en: 'b' });
    expect(toLocalizedRecord(undefined)).toEqual({});
  });
});
