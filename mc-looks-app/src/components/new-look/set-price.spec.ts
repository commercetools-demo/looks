import { parseCents } from './set-price';

describe('parseCents', () => {
  it.each([
    ['189,90', 18990],
    ['189.90', 18990],
    ['189.9', 18990],
    ['190', 19000],
    ['0,05', 5],
    ['  12 ', 1200],
    ['0', 0],
  ])('reads %s as %d cents', (text, cents) => {
    expect(parseCents(text)).toBe(cents);
  });

  it.each(['', 'abc', '12,345', '-5', '1,2,3', '12 €', '1.234,50'])(
    'does not read %j',
    (text) => {
      expect(parseCents(text)).toBeUndefined();
    }
  );
});
