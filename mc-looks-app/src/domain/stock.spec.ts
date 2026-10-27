import { stockStateOf, summarizeSizes } from './stock';

describe('stock', () => {
  it('classifies quantities', () => {
    expect(stockStateOf(0)).toBe('sold-out');
    expect(stockStateOf(-1)).toBe('sold-out');
    expect(stockStateOf(1)).toBe('low');
    expect(stockStateOf(3)).toBe('low');
    expect(stockStateOf(4)).toBe('ok');
  });

  it('summarizes low and sold-out sizes', () => {
    expect(
      summarizeSizes([
        { label: '34', availableQuantity: 10 },
        { label: '36', availableQuantity: 3 },
        { label: '38', availableQuantity: 0 },
      ])
    ).toEqual({ low: [{ label: '36', quantity: 3 }], soldOut: ['38'] });
  });
});
