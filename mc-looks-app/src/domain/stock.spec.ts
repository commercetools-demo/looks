import { stockStateOf } from './stock';

describe('stock', () => {
  it('classifies quantities', () => {
    expect(stockStateOf(0)).toBe('sold-out');
    expect(stockStateOf(-1)).toBe('sold-out');
    expect(stockStateOf(1)).toBe('low');
    expect(stockStateOf(3)).toBe('low');
    expect(stockStateOf(4)).toBe('ok');
  });
});
