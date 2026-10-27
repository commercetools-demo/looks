import { buildPiece } from '../../test-utils/fixtures';
import { buildPreview } from './preview-model';

const jacket = buildPiece('jacket', {
  name: 'Jacke',
  prices: { EUR: 12999, CHF: 14290 },
});
const trousers = buildPiece('trousers', {
  name: 'Hose',
  prices: { EUR: 7999, CHF: 8790 },
});

describe('buildPreview', () => {
  it('computes the sum, the set price and the saving in the given currency', () => {
    const model = buildPreview({
      pieces: [jacket, trousers],
      setPrice: { EUR: 18990, CHF: 20990 },
      currency: 'EUR',
    });
    expect(model).toMatchObject({ sum: 20998, setPrice: 18990, saving: 2008 });
    expect(model.rows.map((row) => row.price)).toEqual([12999, 7999]);
  });

  it('uses the given sum instead of computing it', () => {
    const model = buildPreview({
      pieces: [jacket],
      setPrice: { CHF: 100 },
      sum: { CHF: 500 },
      currency: 'CHF',
    });
    expect(model).toMatchObject({ sum: 500, saving: 400 });
  });

  it('has no usable set price for zero or a missing amount, and no saving at or above the sum', () => {
    expect(
      buildPreview({ pieces: [jacket], setPrice: { EUR: 0 }, currency: 'EUR' })
        .setPrice
    ).toBeUndefined();
    expect(
      buildPreview({ pieces: [jacket], currency: 'EUR' }).setPrice
    ).toBeUndefined();
    const high = buildPreview({
      pieces: [jacket],
      setPrice: { EUR: 13000 },
      currency: 'EUR',
    });
    expect(high.setPrice).toBe(13000);
    expect(high.saving).toBeUndefined();
  });

  it('has no sum when a piece has no price in the currency', () => {
    const noPrice = buildPiece('x', { prices: { CHF: 100 } });
    const model = buildPreview({
      pieces: [jacket, noPrice],
      setPrice: { EUR: 1 },
      currency: 'EUR',
    });
    expect(model.sum).toBeUndefined();
    expect(model.rows[1].price).toBeUndefined();
  });

  it('ignores pieces that are not loaded yet', () => {
    expect(
      buildPreview({ pieces: [undefined, jacket], currency: 'EUR' }).rows
    ).toHaveLength(1);
  });

  it('shows the first size that can be bought and the stock state', () => {
    const piece = buildPiece('p', {
      sizes: [
        { label: '34', availableQuantity: 0 },
        { label: '36', availableQuantity: 2 },
        { label: '38', availableQuantity: 9 },
      ],
    });
    expect(
      buildPreview({ pieces: [piece], currency: 'EUR' }).rows[0]
    ).toMatchObject({
      sizeLabel: '36',
      sizeState: 'low',
      quantity: 2,
      oneSize: false,
    });
    const plain = buildPiece('q', {
      sizes: [{ label: '40', availableQuantity: 4 }],
    });
    expect(
      buildPreview({ pieces: [plain], currency: 'EUR' }).rows[0].sizeState
    ).toBe('ok');
  });

  it('marks a piece sold out in every size, and a one-size piece', () => {
    const soldOut = buildPiece('s', {
      sizes: [
        { label: '36', availableQuantity: 0 },
        { label: '38', availableQuantity: 0 },
      ],
    });
    const scarf = buildPiece('scarf', {
      oneSize: true,
      sizes: [{ label: '', availableQuantity: 1 }],
    });
    const [soldOutRow, scarfRow] = buildPreview({
      pieces: [soldOut, scarf],
      currency: 'EUR',
    }).rows;
    expect(soldOutRow.sizeState).toBe('sold-out');
    expect(scarfRow).toMatchObject({
      oneSize: true,
      sizeState: 'low',
      quantity: 1,
    });
  });
});
