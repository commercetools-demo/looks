import userEvent from '@testing-library/user-event';
import {
  screen,
  within,
} from '@commercetools-frontend/application-shell/test-utils';
import { buildPiece } from '../../test-utils/fixtures';
import { renderUi } from '../../test-utils/render-ui';
import { PreviewPanel } from './preview-panel';
import type { ShopPreviewProps } from './shop-preview';

const jacket = buildPiece('jacket', {
  name: 'Jacke Cleo',
  prices: { EUR: 12999, CHF: 14290 },
});
const scarf = buildPiece('scarf', {
  name: 'Schal',
  oneSize: true,
  sizes: [{ label: '', availableQuantity: 8 }],
  prices: { EUR: 3999, CHF: 4390 },
});
const soldOut = buildPiece('coat', {
  name: 'Mantel',
  sizes: [
    { label: '36', availableQuantity: 0 },
    { label: '38', availableQuantity: 0 },
  ],
});
const low = buildPiece('shirt', {
  name: 'Hemd',
  sizes: [
    { label: '36', availableQuantity: 0 },
    { label: '38', availableQuantity: 2 },
  ],
});

describe('ShopPreview', () => {
  const host = (props: ShopPreviewProps, locale = 'de') =>
    renderUi(<PreviewPanel {...props} />, { locale });

  it('shows a neutral placeholder without a first piece', () => {
    host({ pieces: [] });
    expect(screen.getByTestId('shop-preview-placeholder')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Set in den Warenkorb' })
    ).not.toBeInTheDocument();
  });

  it('shows set price, struck-through sum, saving, rows and an inert button', async () => {
    host({ pieces: [jacket, scarf], setPrice: { EUR: 14999, CHF: 1 } });
    const card = screen.getByTestId('shop-preview');
    expect(within(card).getByText(/^Set zu 149,99/)).toBeInTheDocument();
    expect(within(card).getByText(/Einzelpreise zusammen/)).toBeInTheDocument();
    expect(within(card).getByText(/169,98/)).toBeInTheDocument();
    expect(within(card).getAllByTestId('preview-row')).toHaveLength(2);
    expect(within(card).getByText('Einheitsgröße')).toBeInTheDocument();
    const button = within(card).getByRole('button', {
      name: 'Set in den Warenkorb',
    });
    await userEvent.setup().click(button);
    expect(button).toBeEnabled();
  });

  it('says "Setpreis folgt" without a set price', () => {
    host({ pieces: [jacket] });
    expect(screen.getByText('Setpreis folgt')).toBeInTheDocument();
  });

  it('renders sold-out and low-stock states', () => {
    host({ pieces: [soldOut, low] });
    expect(screen.getByText('ausverkauft')).toBeInTheDocument();
    expect(screen.getByText('nur noch 2')).toBeInTheDocument();
  });

  it('shows the look photo above the rows only when a URL is given', () => {
    host({
      pieces: [jacket],
      photoUrl: 'https://shop.example.com/looks/a.webp',
      photoRatio: { width: 2, height: 3 },
    });
    expect(screen.getByTestId('preview-photo')).toBeInTheDocument();
  });

  it('keeps the card texts German under an English profile; the caption follows the language', async () => {
    host({ pieces: [jacket], setPrice: { EUR: 100 } }, 'en');
    expect(screen.getByText(/^Set zu 1,00/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Set in den Warenkorb' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('How the look appears in the shop')
    ).toBeInTheDocument();
    expect(screen.getByText('Shop preview')).toBeInTheDocument();
  });
});
