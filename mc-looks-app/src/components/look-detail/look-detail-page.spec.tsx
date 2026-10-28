import { fillLookName } from '../../test-utils/names';
import userEvent from '@testing-library/user-event';
import { config } from '../../config';
import { createFakeLookApi } from '../../test-utils/fake-look-api';
import {
  buildDiscount,
  buildObject,
  buildPiece,
} from '../../test-utils/fixtures';
import { cleanup, waitFor, within } from '@testing-library/react';
import { PieceResultCard } from '../new-look/piece-result-card';
import { renderLooks, screen } from '../../test-utils';
import { renderUi } from '../../test-utils/render-ui';
import { LookApiError } from '../../domain/errors';

const ids = ['p1', 'p2', 'p3', 'p4', 'p5'];
const pieces = ids.map((id) => buildPiece(id));

/** A look discount without country (the app's default cart condition). */
const discount = (
  key: string,
  pieceIds: string[],
  overrides: Parameters<typeof buildDiscount>[2] = {}
) => buildDiscount(key, pieceIds, { country: '', ...overrides });

function seed(
  options: {
    pieceIds?: string[];
    pieces?: ReturnType<typeof buildPiece>[];
    setPrice?: Record<string, number>;
    amount?: Record<string, number>;
  } = {}
) {
  const pieceIds = options.pieceIds ?? ['p1', 'p2'];
  return createFakeLookApi({
    objects: [
      buildObject('a', pieceIds, {
        ...(options.setPrice ? { setPrice: options.setPrice } : {}),
      }),
    ],
    discounts: [
      discount('a', pieceIds, options.amount ? { amount: options.amount } : {}),
    ],
    pieces: options.pieces ?? pieces,
  });
}

/** Pieces priced in EUR for DE and FR and in GBP for GB; a look at
 *  180/190/160 with one discount per country. */
function seedCountries(options: { gbPrice?: number } = {}) {
  const prices = { 'EUR/DE': 10000, 'EUR/FR': 10000, 'GBP/GB': 9000 };
  const fake = createFakeLookApi({
    objects: [
      buildObject('a', ['p1', 'p2'], {
        setPrice: { 'EUR/DE': 18000, 'EUR/FR': 19000, 'GBP/GB': 16000 },
      }),
    ],
    discounts: [
      buildDiscount('a', ['p1', 'p2'], {
        country: 'DE',
        amount: { EUR: 2000 },
      }),
      buildDiscount('a-FR', ['p1', 'p2'], {
        country: 'FR',
        amount: { EUR: 1000 },
      }),
      buildDiscount('a-GB', ['p1', 'p2'], {
        country: 'GB',
        amount: { GBP: 2000 },
      }),
    ],
    pieces: [
      buildPiece('p1', {
        prices: { ...prices, 'GBP/GB': options.gbPrice ?? 9000 },
      }),
      buildPiece('p2', { prices }),
    ],
  });
  return { api: fake.api, fake };
}

/** The set-price text field of a table row: `EUR` or `EUR DE`. */
const cell = async (label: string) =>
  within(
    await screen.findByRole('group', { name: `Setpreis ${label}` })
  ).getByRole('textbox');
const percent = (label: string) =>
  screen.getByRole('textbox', { name: `Ersparnis in Prozent ${label}` });

async function enterPrices(values: Record<string, string>) {
  for (const [label, text] of Object.entries(values)) {
    const input = await cell(label);
    await userEvent.clear(input);
    await userEvent.type(input, text);
    await userEvent.tab();
  }
}

const savePrice = () =>
  userEvent.click(screen.getByRole('button', { name: 'Setpreis speichern' }));

describe('look detail', () => {
  const origin = config.shopOrigin;
  afterEach(() => {
    config.shopOrigin = origin;
  });

  describe('header and layout', () => {
    it('shows back link, title, key, active switch and the shop link', async () => {
      config.shopOrigin = 'https://shop.example.com';
      renderLooks({ api: seed().api, path: '/a' });
      expect(
        await screen.findByRole('heading', { name: 'a de' })
      ).toBeInTheDocument();
      expect(screen.getByText('a')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Zurück zu Looks' })
      ).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'a de aktiv' })).toBeChecked();
      expect(
        screen.getByRole('link', { name: 'Im Shop ansehen' })
      ).toHaveAttribute('href', 'https://shop.example.com/');
      expect(screen.queryByText('Nur Lesezugriff')).not.toBeInTheDocument();
    });

    it('disables the shop link with a hint when no shop origin is configured', async () => {
      config.shopOrigin = '';
      renderLooks({ api: seed().api, path: '/a' });
      expect(
        await screen.findByRole('button', { name: 'Im Shop ansehen' })
      ).toBeDisabled();
      expect(
        screen.getByText('Shop-Adresse nicht konfiguriert')
      ).toBeInTheDocument();
    });

    it('shows the name in the data locale', async () => {
      renderLooks({ api: seed().api, path: '/a', dataLocale: 'en' });
      expect(
        await screen.findByRole('heading', { name: 'a en' })
      ).toBeInTheDocument();
    });

    it('shows a skeleton while loading and an error with retry', async () => {
      const fake = seed();
      fake.failNext('getLookObject', new Error('boom'));
      renderLooks({ api: fake.api, path: '/a' });
      expect(screen.getByLabelText('Wird geladen')).toBeInTheDocument();
      expect(
        await screen.findByText('Der Look konnte nicht geladen werden')
      ).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: 'Erneut versuchen' })
      );
      expect(await screen.findByText('Teile (2)')).toBeInTheDocument();
    });

    it('US5.7: says "Look nicht gefunden" with the key for an unknown look', async () => {
      renderLooks({ api: createFakeLookApi().api, path: '/nope' });
      expect(
        await screen.findByRole('heading', { name: 'Look nicht gefunden' })
      ).toBeInTheDocument();
      expect(screen.getByText(/„nope“/)).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Zurück zu Looks' })
      ).toBeInTheDocument();
    });
  });

  describe('pieces and stock', () => {
    const tiles = () => within(screen.getByRole('list', { name: /^Teile/ }));

    it('US5.1: shows all five pieces of a five-piece look as tiles', async () => {
      renderLooks({
        api: seed({
          pieceIds: ids,
          setPrice: { EUR: 40000, CHF: 44000 },
          amount: { EUR: 10000, CHF: 11000 },
        }).api,
        path: '/a',
      });
      expect(await screen.findByText('Teile (5)')).toBeInTheDocument();
      expect(
        screen.getByRole('list', { name: 'Teile (5)' })
      ).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
      for (const id of ids)
        expect(tiles().getByText(`Piece ${id}`)).toBeInTheDocument();
    });

    it('shows a tile for every piece of a seven-piece look', async () => {
      const seven = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
      renderLooks({
        api: seed({
          pieceIds: seven,
          pieces: seven.map((id) => buildPiece(id)),
          setPrice: { EUR: 60000, CHF: 66000 },
          amount: { EUR: 10000, CHF: 11000 },
        }).api,
        path: '/a',
      });
      expect(await screen.findByText('Teile (7)')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(7);
      for (const id of seven)
        expect(tiles().getByText(`Piece ${id}`)).toBeInTheDocument();
    });

    it('shows no add button and no "Im Look" marker on the tiles', async () => {
      renderLooks({ api: seed().api, path: '/a' });
      await screen.findByText('Teile (2)');
      expect(tiles().queryByRole('button')).not.toBeInTheDocument();
      expect(tiles().queryByText('Im Look')).not.toBeInTheDocument();
      expect(tiles().queryByText('Hinzufügen')).not.toBeInTheDocument();
    });

    it('shows neither prices nor plain stock counts on the tiles', async () => {
      renderLooks({ api: seed().api, path: '/a' });
      await screen.findByText('Teile (2)');
      expect(tiles().queryByText(/100,00\s€/)).not.toBeInTheDocument();
      expect(tiles().queryByText(/110,00\sCHF/)).not.toBeInTheDocument();
      expect(tiles().queryByText('36: 5')).not.toBeInTheDocument();
    });

    it('shows the same size chips as the tile of the creation flow', async () => {
      const piece = buildPiece('p1', {
        sizes: [
          { sku: 'a', label: '36', availableQuantity: 0 },
          { sku: 'b', label: '38', availableQuantity: 2 },
          { sku: 'c', label: '40', availableQuantity: 9 },
        ],
      });
      renderLooks({
        api: seed({ pieces: [piece, buildPiece('p2')] }).api,
        path: '/a',
      });
      await screen.findByText('Teile (2)');
      const detail = tiles().getAllByRole('listitem')[0];
      const chips = ['36', '38', '40'].map((label) =>
        within(detail).getByText(label)
      );
      expect(chips[0]).toHaveStyle({ textDecoration: 'line-through' });
      cleanup();

      renderUi(<PieceResultCard piece={piece} state="available" />);
      for (const [index, label] of ['36', '38', '40'].entries()) {
        const created = screen.getByText(label);
        expect(created.tagName).toBe(chips[index].tagName);
        expect(created.className).toBe(chips[index].className);
      }
      expect(screen.getByText('38: nur noch 2')).toBeInTheDocument();
    });

    it('US5.2: low and sold-out sizes get a hint like on the creation tile', async () => {
      const p1 = buildPiece('p1', {
        sizes: [
          { label: '36', availableQuantity: 0 },
          { label: '38', availableQuantity: 1 },
          { label: '40', availableQuantity: 0 },
          { label: '42', availableQuantity: 9 },
        ],
      });
      renderLooks({
        api: seed({ pieces: [p1, buildPiece('p2')] }).api,
        path: '/a',
      });
      expect(await screen.findByText('38: nur noch 1')).toBeInTheDocument();
      expect(screen.getByText('ausverkauft: 36, 40')).toBeInTheDocument();
      expect(screen.queryByText('42: 9')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/in allen Größen ausverkauft/)
      ).not.toBeInTheDocument();
    });

    it('US5.2: warns when a piece is sold out in every size', async () => {
      const p1 = buildPiece('p1', {
        sizes: [
          { label: '36', availableQuantity: 0 },
          { label: '38', availableQuantity: 0 },
        ],
        soldOutEverywhere: true,
      });
      renderLooks({
        api: seed({ pieces: [p1, buildPiece('p2')] }).api,
        path: '/a',
      });
      expect(
        await screen.findByText('Piece p1 ist in allen Größen ausverkauft')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/nicht zum Setpreis kaufbar/)
      ).toBeInTheDocument();
      expect(screen.getByText('ausverkauft: 36, 38')).toBeInTheDocument();
    });

    it('shows "Einheitsgröße" for a one-size piece', async () => {
      const p1 = buildPiece('p1', {
        oneSize: true,
        sizes: [{ label: '', availableQuantity: 4 }],
      });
      renderLooks({
        api: seed({ pieces: [p1, buildPiece('p2')] }).api,
        path: '/a',
      });
      await screen.findByText('Teile (2)');
      expect(tiles().getByText('Einheitsgröße')).toBeInTheDocument();
    });

    it('shows a tile named by its id for a piece whose product is not loaded', async () => {
      renderLooks({
        api: seed({ pieces: [buildPiece('p1')] }).api,
        path: '/a',
      });
      await screen.findByText('Teile (2)');
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(tiles().getByText('Piece p1')).toBeInTheDocument();
      expect(tiles().getByText('p2')).toBeInTheDocument();
    });
  });

  describe('set price', () => {
    it('prefills the stored set price and shows sum and saving per row', async () => {
      renderLooks({ api: seed().api, path: '/a' });
      expect(await cell('EUR')).toHaveValue('180,00');
      expect(await cell('CHF')).toHaveValue('198,00');
      expect(percent('EUR')).toHaveValue('10');
      expect(percent('CHF')).toHaveValue('10');
      const row = within(screen.getByTestId('price-row-EUR'));
      expect(row.getAllByText(/100,00\s€/)).toHaveLength(2);
      expect(row.getByText(/200,00\s€/)).toBeInTheDocument();
    });

    it('typing a saving in percent writes the set price', async () => {
      renderLooks({ api: seed().api, path: '/a' });
      await cell('EUR');
      const field = percent('EUR');
      await userEvent.clear(field);
      await userEvent.type(field, '25');
      await userEvent.tab();
      expect(await cell('EUR')).toHaveValue('150,00');
    });

    it('US5.3: recomputes the discount first, then the definition, and confirms', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await enterPrices({ EUR: '170,00', CHF: '187,00' });
      await savePrice();
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      const order = fake.calls
        .map((c) => c.method)
        .filter((m) => m === 'updateCartDiscount' || m === 'writeLookObject');
      expect(order).toEqual(['updateCartDiscount', 'writeLookObject']);
      expect(fake.discounts.get('disc-a')?.amount).toEqual({
        EUR: 3000,
        CHF: 3300,
      });
      expect(fake.objects.get('look-a')?.value.setPrice).toEqual({
        EUR: 17000,
        CHF: 18700,
      });
      expect(await cell('EUR')).toHaveValue('170,00');
    });

    it('writes nothing and says "Keine Änderung" when the price is unchanged', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await cell('EUR');
      await savePrice();
      expect(await screen.findByText('Keine Änderung')).toBeInTheDocument();
      expect(fake.callsTo('updateCartDiscount')).toHaveLength(0);
      expect(fake.callsTo('writeLookObject')).toHaveLength(0);
    });

    it('refuses a set price that is not below the sum, under the row', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await enterPrices({ EUR: '200', CHF: '100' });
      await savePrice();
      expect(
        await within(screen.getByTestId('price-row-EUR')).findByText(
          /muss unter der Summe der Einzelpreise liegen/
        )
      ).toBeInTheDocument();
      expect(fake.callsTo('updateCartDiscount')).toHaveLength(0);
      expect(fake.callsTo('writeLookObject')).toHaveLength(0);
    });

    it('refuses an empty price', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await enterPrices({ EUR: 'abc' });
      await savePrice();
      expect(
        await screen.findByText('Bitte einen Setpreis über 0 eingeben')
      ).toBeInTheDocument();
      expect(fake.callsTo('writeLookObject')).toHaveLength(0);
    });

    it('US5.4: after a failed definition write it says so and the retry writes only the object', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await enterPrices({ EUR: '170', CHF: '187' });
      fake.failNext('writeLookObject');
      await savePrice();
      expect(
        await screen.findByText('Setpreis im Shop noch nicht aktualisiert')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Der Rabatt ist geändert, die Look-Definition noch nicht/
        )
      ).toBeInTheDocument();
      expect(fake.callsTo('updateCartDiscount')).toHaveLength(1);

      await userEvent.click(
        screen.getByRole('button', { name: 'Erneut versuchen' })
      );
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      expect(fake.callsTo('updateCartDiscount')).toHaveLength(1);
      expect(fake.objects.get('look-a')?.value.setPrice).toEqual({
        EUR: 17000,
        CHF: 18700,
      });
      await waitFor(() =>
        expect(
          screen.queryByText('Setpreis im Shop noch nicht aktualisiert')
        ).not.toBeInTheDocument()
      );
      expect(screen.queryByText('Setpreis weicht ab')).not.toBeInTheDocument();
    });

    it("US5.5: shows the drift and recalculates the discount from today's prices", async () => {
      const fake = seed({
        pieces: [
          buildPiece('p1', { prices: { EUR: 11000, CHF: 11000 } }),
          buildPiece('p2'),
        ],
      });
      renderLooks({ api: fake.api, path: '/a' });
      expect(await screen.findByText('Setpreis weicht ab')).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: 'Setpreis neu berechnen' })
      );
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      expect(fake.discounts.get('disc-a')?.amount).toEqual({
        EUR: 3000,
        CHF: 2200,
      });
      expect(fake.objects.get('look-a')?.value.setPrice).toEqual({
        EUR: 18000,
        CHF: 19800,
      });
      await waitFor(() =>
        expect(screen.queryByText('Setpreis weicht ab')).not.toBeInTheDocument()
      );
    });

    it('warns when a currency has no set price', async () => {
      renderLooks({ api: seed({ setPrice: { EUR: 18000 } }).api, path: '/a' });
      expect(
        await screen.findByText('Setpreis fehlt in einer Währung')
      ).toBeInTheDocument();
      expect(await cell('CHF')).toHaveValue('');
    });

    it('works with a single project currency', async () => {
      const eurOnly = { EUR: 10000 };
      const fake = createFakeLookApi({
        objects: [buildObject('a', ['p1', 'p2'], { setPrice: { EUR: 18000 } })],
        discounts: [discount('a', ['p1', 'p2'], { amount: { EUR: 2000 } })],
        pieces: [
          buildPiece('p1', { prices: eurOnly }),
          buildPiece('p2', { prices: eurOnly }),
        ],
      });
      renderLooks({ api: fake.api, path: '/a', currencies: ['EUR'] });
      await enterPrices({ EUR: '150' });
      expect(
        screen.queryByRole('textbox', { name: 'Setpreis CHF' })
      ).not.toBeInTheDocument();
      await savePrice();
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      expect(fake.discounts.get('disc-a')?.amount).toEqual({ EUR: 5000 });
    });

    it('works with three project currencies', async () => {
      const prices = { EUR: 10000, CHF: 11000, USD: 12000 };
      const fake = createFakeLookApi({
        objects: [
          buildObject('a', ['p1', 'p2'], {
            setPrice: { EUR: 18000, CHF: 19800, USD: 21600 },
          }),
        ],
        discounts: [
          discount('a', ['p1', 'p2'], {
            amount: { EUR: 2000, CHF: 2200, USD: 2400 },
          }),
        ],
        pieces: [buildPiece('p1', { prices }), buildPiece('p2', { prices })],
      });
      renderLooks({
        api: fake.api,
        path: '/a',
        currencies: ['EUR', 'CHF', 'USD'],
      });
      await enterPrices({ USD: '200' });
      expect(await cell('USD')).toHaveValue('200,00');
      await savePrice();
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      expect(fake.objects.get('look-a')?.value.setPrice).toEqual({
        EUR: 18000,
        CHF: 19800,
        USD: 20000,
      });
    });

    it('shows no row for a cell where a piece has no price', async () => {
      const fake = seed({
        pieces: [
          buildPiece('p1'),
          buildPiece('p2', { prices: { EUR: 10000 } }),
        ],
      });
      renderLooks({ api: fake.api, path: '/a' });
      expect(await cell('EUR')).toBeEnabled();
      expect(screen.queryByTestId('price-row-CHF')).not.toBeInTheDocument();
    });

    it('cannot empty a stored set price: row error, nothing written', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      const input = await cell('EUR');
      await userEvent.clear(input);
      await userEvent.tab();
      await savePrice();
      expect(
        await within(screen.getByTestId('price-row-EUR')).findByText(
          'Bitte einen Setpreis über 0 eingeben'
        )
      ).toBeInTheDocument();
      expect(fake.callsTo('writeLookObject')).toHaveLength(0);
    });
  });

  describe('set price per country', () => {
    it('shows one row per currency and country with its sum', async () => {
      const { api } = seedCountries();
      renderLooks({ api, path: '/a', currencies: ['EUR', 'GBP'] });
      expect(await cell('EUR DE')).toHaveValue('180,00');
      expect(await cell('EUR FR')).toHaveValue('190,00');
      expect(await cell('GBP GB')).toHaveValue('160,00');
      const rows = screen
        .getAllByTestId(/^price-row-/)
        .map((row) => row.getAttribute('data-testid'));
      expect(rows).toEqual([
        'price-row-EUR/DE',
        'price-row-EUR/FR',
        'price-row-GBP/GB',
      ]);
      expect(
        within(screen.getByTestId('price-row-EUR/DE')).getByText(/200,00\s€/)
      ).toBeInTheDocument();
      expect(
        within(screen.getByTestId('price-row-GBP/GB')).getByText(/180,00\s£/)
      ).toBeInTheDocument();
      expect(percent('EUR DE')).toHaveValue('10');
      expect(percent('EUR FR')).toHaveValue('5');
      expect(percent('GBP GB')).toHaveValue('11,1');
      expect(screen.queryByText('Setpreis weicht ab')).not.toBeInTheDocument();
    });

    it('editing the percent of one row changes only that price input', async () => {
      const { api } = seedCountries();
      renderLooks({ api, path: '/a', currencies: ['EUR', 'GBP'] });
      await cell('EUR DE');
      const field = percent('EUR DE');
      await userEvent.clear(field);
      await userEvent.type(field, '20');
      await userEvent.tab();
      expect(await cell('EUR DE')).toHaveValue('160,00');
      expect(await cell('EUR FR')).toHaveValue('190,00');
      expect(await cell('GBP GB')).toHaveValue('160,00');
    });

    it('writes changeValue only for the changed country discount, then the object', async () => {
      const fake = seedCountries().fake;
      renderLooks({ api: fake.api, path: '/a', currencies: ['EUR', 'GBP'] });
      await enterPrices({ 'EUR DE': '160' });
      await savePrice();
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      const updates = fake.callsTo('updateCartDiscount');
      expect(updates.map((call) => call.args[0])).toEqual(['disc-a']);
      expect(updates[0].args[2]).toEqual([
        expect.objectContaining({ changeValue: expect.anything() }),
      ]);
      expect(fake.discounts.get('disc-a')?.amount).toEqual({ EUR: 4000 });
      expect(fake.discounts.get('disc-a-FR')?.amount).toEqual({ EUR: 1000 });
      expect(fake.discounts.get('disc-a-GB')?.amount).toEqual({ GBP: 2000 });
      expect(fake.objects.get('look-a')?.value.setPrice).toEqual({
        'EUR/DE': 16000,
        'EUR/FR': 19000,
        'GBP/GB': 16000,
      });
      const order = fake.calls
        .map((c) => c.method)
        .filter((m) => m === 'updateCartDiscount' || m === 'writeLookObject');
      expect(order).toEqual(['updateCartDiscount', 'writeLookObject']);
    });

    it('updates one discount per changed country, then the object', async () => {
      const fake = seedCountries().fake;
      renderLooks({ api: fake.api, path: '/a', currencies: ['EUR', 'GBP'] });
      await enterPrices({ 'EUR FR': '170', 'GBP GB': '150' });
      await savePrice();
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      expect(
        fake.callsTo('updateCartDiscount').map((call) => call.args[0])
      ).toEqual(['disc-a-FR', 'disc-a-GB']);
      expect(fake.callsTo('writeLookObject')).toHaveLength(1);
      expect(fake.discounts.get('disc-a')?.amount).toEqual({ EUR: 2000 });
      expect(fake.discounts.get('disc-a-FR')?.amount).toEqual({ EUR: 3000 });
      expect(fake.discounts.get('disc-a-GB')?.amount).toEqual({ GBP: 3000 });
    });

    it('writes nothing when no country price changed', async () => {
      const fake = seedCountries().fake;
      renderLooks({ api: fake.api, path: '/a', currencies: ['EUR', 'GBP'] });
      await cell('EUR DE');
      await savePrice();
      expect(await screen.findByText('Keine Änderung')).toBeInTheDocument();
      expect(fake.callsTo('updateCartDiscount')).toHaveLength(0);
      expect(fake.callsTo('writeLookObject')).toHaveLength(0);
    });

    it('shows an error under the row of a country price that is not below its sum', async () => {
      const fake = seedCountries().fake;
      renderLooks({ api: fake.api, path: '/a', currencies: ['EUR', 'GBP'] });
      await enterPrices({ 'GBP GB': '200' });
      await savePrice();
      expect(
        await within(screen.getByTestId('price-row-GBP/GB')).findByText(
          /muss unter der Summe der Einzelpreise liegen/
        )
      ).toBeInTheDocument();
      expect(fake.callsTo('updateCartDiscount')).toHaveLength(0);
    });

    it('drift in one country row shows the alert and recalculates only that discount', async () => {
      const fake = seedCountries({ gbPrice: 9500 }).fake;
      renderLooks({ api: fake.api, path: '/a', currencies: ['EUR', 'GBP'] });
      expect(await screen.findByText('Setpreis weicht ab')).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: 'Setpreis neu berechnen' })
      );
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      expect(
        fake.callsTo('updateCartDiscount').map((call) => call.args[0])
      ).toEqual(['disc-a-GB']);
      expect(fake.discounts.get('disc-a-GB')?.amount).toEqual({ GBP: 2500 });
      expect(fake.discounts.get('disc-a')?.amount).toEqual({ EUR: 2000 });
      expect(fake.discounts.get('disc-a-FR')?.amount).toEqual({ EUR: 1000 });
      expect(fake.objects.get('look-a')?.value.setPrice).toEqual({
        'EUR/DE': 18000,
        'EUR/FR': 19000,
        'GBP/GB': 16000,
      });
      // Known gap: the row is not refreshed with the written country
      // discount, so the alert stays until the page is reloaded.
    });

    it('a row without a stored set price starts empty, gets no discount while empty and creates one when filled', async () => {
      const prices = { 'EUR/DE': 10000, 'EUR/FR': 10000 };
      const fake = createFakeLookApi({
        objects: [
          buildObject('a', ['p1', 'p2'], { setPrice: { 'EUR/DE': 18000 } }),
        ],
        discounts: [
          buildDiscount('a', ['p1', 'p2'], {
            country: 'DE',
            amount: { EUR: 2000 },
          }),
        ],
        pieces: [buildPiece('p1', { prices }), buildPiece('p2', { prices })],
      });
      renderLooks({ api: fake.api, path: '/a', currencies: ['EUR'] });
      expect(await cell('EUR FR')).toHaveValue('');
      await savePrice();
      expect(await screen.findByText('Keine Änderung')).toBeInTheDocument();
      expect(fake.callsTo('createCartDiscount')).toHaveLength(0);

      await enterPrices({ 'EUR FR': '170' });
      await savePrice();
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      expect(fake.callsTo('createCartDiscount')).toHaveLength(1);
      expect(fake.discounts.get('disc-a')?.amount).toEqual({ EUR: 2000 });
      const created = [...fake.discounts.values()].find(
        (d) => d.key === 'look-a-FR'
      );
      expect(created?.amount).toEqual({ EUR: 3000 });
      expect(fake.objects.get('look-a')?.value.setPrice).toEqual({
        'EUR/DE': 18000,
        'EUR/FR': 17000,
      });
    });

    it('disables every price and percent field without Manage', async () => {
      const { api } = seedCountries();
      renderLooks({
        api,
        path: '/a',
        currencies: ['EUR', 'GBP'],
        canManage: false,
      });
      expect(await cell('EUR DE')).toBeDisabled();
      expect(await cell('GBP GB')).toBeDisabled();
      expect(percent('EUR FR')).toBeDisabled();
    });
  });

  describe('set price with a relative discount', () => {
    /** DE is a 15 % discount (relative), FR an absolute one; sums are 200 EUR. */
    function seedRelative(options: { permyriad?: number } = {}) {
      const prices = { 'EUR/DE': 10000, 'EUR/FR': 10000 };
      const fake = createFakeLookApi({
        objects: [
          buildObject('a', ['p1', 'p2'], {
            // The stored DE price is stale on purpose: it follows the sum.
            setPrice: { 'EUR/DE': 1, 'EUR/FR': 19000 },
            savingPercent: { 'EUR/DE': 15 },
          }),
        ],
        discounts: [
          buildDiscount('a', ['p1', 'p2'], {
            country: 'DE',
            amount: {},
            permyriad: options.permyriad ?? 1500,
          }),
          buildDiscount('a-FR', ['p1', 'p2'], {
            country: 'FR',
            amount: { EUR: 1000 },
          }),
        ],
        pieces: [buildPiece('p1', { prices }), buildPiece('p2', { prices })],
      });
      return fake;
    }
    const open = (fake: ReturnType<typeof seedRelative>) =>
      renderLooks({ api: fake.api, path: '/a', currencies: ['EUR'] });
    const kindOf = (key: string) =>
      within(screen.getByTestId(`price-row-${key}`))
        .getAllByRole('cell')
        .at(-1);

    it("loads percentage rows in percent mode with the price derived from today's sum", async () => {
      open(seedRelative());
      expect(await cell('EUR DE')).toHaveValue('170,00');
      expect(percent('EUR DE')).toHaveValue('15');
      expect(kindOf('EUR/DE')).toHaveTextContent('Prozent');
      expect(kindOf('EUR/FR')).toHaveTextContent('Betrag');
      expect(screen.queryByText('Setpreis weicht ab')).not.toBeInTheDocument();
    });

    it('writes nothing when nothing changed', async () => {
      const fake = seedRelative();
      open(fake);
      await cell('EUR DE');
      await savePrice();
      expect(await screen.findByText('Keine Änderung')).toBeInTheDocument();
      expect(fake.callsTo('updateCartDiscount')).toHaveLength(0);
      expect(fake.callsTo('writeLookObject')).toHaveLength(0);
    });

    it('changes the permyriad when the percentage changes', async () => {
      const fake = seedRelative();
      open(fake);
      await cell('EUR DE');
      await userEvent.clear(percent('EUR DE'));
      await userEvent.type(percent('EUR DE'), '20');
      await userEvent.tab();
      await savePrice();
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      expect(fake.discounts.get('disc-a')?.permyriad).toBe(2000);
      expect(fake.objects.get('look-a')?.value.savingPercent).toEqual({
        'EUR/DE': 20,
      });
    });

    it('switches the row to an absolute discount when its price is edited', async () => {
      const fake = seedRelative();
      open(fake);
      await enterPrices({ 'EUR DE': '160' });
      expect(kindOf('EUR/DE')).toHaveTextContent('Betrag');
      await savePrice();
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      expect(fake.discounts.get('disc-a')?.amount).toEqual({ EUR: 4000 });
      expect(fake.discounts.get('disc-a')?.permyriad).toBeUndefined();
      expect(fake.objects.get('look-a')?.value.savingPercent).toBeUndefined();
    });

    it('applies a global percentage: absolute rows become relative', async () => {
      const fake = seedRelative();
      open(fake);
      await cell('EUR DE');
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Prozent für alle Zeilen' }),
        '10'
      );
      await userEvent.tab();
      expect(kindOf('EUR/FR')).toHaveTextContent('Prozent');
      await savePrice();
      expect(
        await screen.findAllByText('Setpreis gespeichert')
      ).not.toHaveLength(0);
      expect(fake.discounts.get('disc-a')?.permyriad).toBe(1000);
      expect(fake.discounts.get('disc-a-FR')?.permyriad).toBe(1000);
      expect(fake.discounts.get('disc-a-FR')?.amount).toEqual({});
    });

    it('shows the drift alert only when the permyriad mismatches', async () => {
      open(seedRelative({ permyriad: 1000 }));
      expect(await screen.findByText('Setpreis weicht ab')).toBeInTheDocument();
    });
  });

  describe('status switch', () => {
    it('switches the look off from the detail and records the end date', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await userEvent.click(
        await screen.findByRole('switch', { name: 'a de aktiv' })
      );
      await waitFor(() =>
        expect(fake.discounts.get('disc-a')?.isActive).toBe(false)
      );
      expect(fake.objects.get('look-a')?.value.endedAt).toEqual(
        expect.any(String)
      );
      expect(
        await screen.findByRole('switch', { name: 'a de aktiv' })
      ).not.toBeChecked();
    });

    it('switches the country discounts too: main first when off, main last when on', async () => {
      const { api, fake } = seedCountries();
      renderLooks({ api, path: '/a', currencies: ['EUR', 'GBP'] });
      const toggle = await screen.findByRole('switch', { name: 'a de aktiv' });
      await userEvent.click(toggle);
      await waitFor(() =>
        expect([...fake.discounts.values()].every((d) => !d.isActive)).toBe(
          true
        )
      );
      expect(
        fake.callsTo('updateCartDiscount').map((call) => call.args[0])
      ).toEqual(['disc-a', 'disc-a-FR', 'disc-a-GB']);

      const before = fake.callsTo('updateCartDiscount').length;
      await userEvent.click(
        await screen.findByRole('switch', { name: 'a de aktiv' })
      );
      await waitFor(() =>
        expect([...fake.discounts.values()].every((d) => d.isActive)).toBe(true)
      );
      // The row keeps the country discounts' old versions, so each one is
      // written again after a conflict: compare the order of first writes.
      const ids = fake
        .callsTo('updateCartDiscount')
        .slice(before)
        .map((call) => call.args[0]);
      expect([...new Set(ids)]).toEqual(['disc-a-FR', 'disc-a-GB', 'disc-a']);
    });

    it('switches the look group first when off and on again, then the discounts', async () => {
      const { api, fake } = seedCountries();
      fake.groups.set('grp-a', {
        id: 'grp-a',
        version: 1,
        key: 'look-a',
        sortOrder: '0.7',
        isActive: true,
      });
      renderLooks({ api, path: '/a', currencies: ['EUR', 'GBP'] });
      await userEvent.click(
        await screen.findByRole('switch', { name: 'a de aktiv' })
      );
      await waitFor(() =>
        expect([...fake.discounts.values()].every((d) => !d.isActive)).toBe(
          true
        )
      );
      expect(fake.groups.get('grp-a')?.isActive).toBe(false);
      const switchCalls = () =>
        fake.calls
          .filter((call) =>
            ['updateDiscountGroup', 'updateCartDiscount'].includes(call.method)
          )
          .map((call) => call.method);
      expect(switchCalls()[0]).toBe('updateDiscountGroup');

      const before = fake.calls.length;
      await userEvent.click(
        await screen.findByRole('switch', { name: 'a de aktiv' })
      );
      await waitFor(() =>
        expect([...fake.discounts.values()].every((d) => d.isActive)).toBe(true)
      );
      expect(fake.groups.get('grp-a')?.isActive).toBe(true);
      expect(
        fake.calls
          .slice(before)
          .filter((call) =>
            ['updateDiscountGroup', 'updateCartDiscount'].includes(call.method)
          )[0].method
      ).toBe('updateDiscountGroup');
    });

    it('switches a legacy look without a group and makes no group call', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await userEvent.click(
        await screen.findByRole('switch', { name: 'a de aktiv' })
      );
      await waitFor(() =>
        expect(fake.discounts.get('disc-a')?.isActive).toBe(false)
      );
      expect(fake.callsTo('updateDiscountGroup')).toHaveLength(0);
    });
  });

  describe('read-only access', () => {
    it('shows everything and disables every write control', async () => {
      config.shopOrigin = 'https://shop.example.com';
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a', canManage: false });
      expect(await screen.findByText('Nur Lesezugriff')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'a de aktiv' })).toBeDisabled();
      expect(await cell('EUR')).toBeDisabled();
      expect(await cell('CHF')).toBeDisabled();
      expect(percent('EUR')).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Setpreis speichern' })
      ).toBeDisabled();
      expect(screen.getByText('Teile (2)')).toBeInTheDocument();
    });

    it('disables the recalculate button on drift', async () => {
      const fake = seed({
        pieces: [
          buildPiece('p1', { prices: { EUR: 11000, CHF: 11000 } }),
          buildPiece('p2'),
        ],
      });
      renderLooks({ api: fake.api, path: '/a', canManage: false });
      expect(
        await screen.findByRole('button', { name: 'Setpreis neu berechnen' })
      ).toBeDisabled();
    });
  });

  describe('repair (US6)', () => {
    it('US6.2: completes a discount without definition from the discount, keeping its state', async () => {
      const fake = createFakeLookApi({
        discounts: [buildDiscount('a', ['p1', 'p2'], { isActive: true })],
        pieces,
      });
      renderLooks({ api: fake.api, path: '/a' });
      expect(await screen.findByText('Unvollständig')).toBeInTheDocument();
      expect(screen.getByText(/fehlt die Look-Definition/)).toBeInTheDocument();
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('textbox', { name: 'Setpreis EUR' })
      ).not.toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: 'Vervollständigen' })
      );
      expect(
        await screen.findAllByText('Look vervollständigt')
      ).not.toHaveLength(0);
      expect(fake.objects.get('look-a')?.value).toEqual({
        componentProductIds: ['p1', 'p2'],
        setPrice: { EUR: 18000, CHF: 19800 },
      });
      expect(fake.discounts.get('disc-a')?.isActive).toBe(true);
      expect(
        await screen.findByRole('switch', { name: 'a de aktiv' })
      ).toBeChecked();
    });

    it('US6.1: completes a definition without discount with a name, inactive', async () => {
      const fake = createFakeLookApi({
        objects: [buildObject('a', ['p1', 'p2'])],
        pieces,
      });
      renderLooks({ api: fake.api, path: '/a' });
      const complete = await screen.findByRole('button', {
        name: 'Vervollständigen',
      });
      expect(complete).toBeDisabled();
      await fillLookName(userEvent.setup(), {
        de: 'Neuer Look',
        en: 'New look',
      });
      await userEvent.click(complete);
      expect(
        await screen.findAllByText('Look vervollständigt')
      ).not.toHaveLength(0);
      const created = [...fake.discounts.values()][0];
      expect(created.key).toBe('look-a');
      expect(created.isActive).toBe(false);
      expect(created.name).toEqual(
        expect.objectContaining({ de: expect.stringContaining('Neuer Look') })
      );
      expect(
        await screen.findByRole('switch', { name: /aktiv/ })
      ).not.toBeChecked();
    });

    it('US6.3: says to check an inconsistent look in the Merchant Center and offers no switch', async () => {
      const fake = createFakeLookApi({
        objects: [buildObject('a', ['p1', 'p2'])],
        discounts: [buildDiscount('a', ['p1', 'p3'])],
        pieces,
      });
      renderLooks({ api: fake.api, path: '/a' });
      expect(
        await screen.findByText(/nennen verschiedene Teile/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/bitte im Merchant Center prüfen/)
      ).toBeInTheDocument();
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Vervollständigen' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Setpreis speichern' })
      ).not.toBeInTheDocument();
    });

    it('disables completing without Manage', async () => {
      const fake = createFakeLookApi({
        discounts: [buildDiscount('a', ['p1', 'p2'])],
        pieces,
      });
      renderLooks({ api: fake.api, path: '/a', canManage: false });
      expect(
        await screen.findByRole('button', { name: 'Vervollständigen' })
      ).toBeDisabled();
    });
  });

  describe('delete look', () => {
    const inactiveSeed = () => {
      const fake = createFakeLookApi({
        objects: [buildObject('a', ['p1', 'p2'])],
        discounts: [discount('a', ['p1', 'p2'], { isActive: false })],
        groups: [
          {
            id: 'grp-a',
            version: 1,
            key: 'look-a',
            sortOrder: '0.7',
            isActive: false,
          },
        ],
        pieces,
      });
      return fake;
    };
    const deleteButton = () =>
      screen.getByRole('button', { name: 'Look löschen' });

    it('always shows the card; the button is enabled for an active look', async () => {
      renderLooks({ api: seed().api, path: '/a' });
      expect(
        await screen.findByRole('heading', { name: 'Look löschen' })
      ).toBeInTheDocument();
      expect(deleteButton()).toBeEnabled();
    });

    it('warns in the confirmation of an active look, not of an inactive one', async () => {
      const warning =
        'Der Look ist aktiv: Seine Rabatte verschwinden sofort aus dem Shop.';
      const active = renderLooks({ api: seed().api, path: '/a' });
      await screen.findByRole('heading', { name: 'Look löschen' });
      expect(screen.queryByText(warning)).not.toBeInTheDocument();
      await userEvent.click(deleteButton());
      expect(screen.getByText(warning)).toBeInTheDocument();
      active.unmount();

      renderLooks({ api: inactiveSeed().api, path: '/a' });
      await screen.findByRole('heading', { name: 'Look löschen' });
      await userEvent.click(deleteButton());
      expect(
        screen.getByText('Look „a de“ endgültig löschen?')
      ).toBeInTheDocument();
      expect(screen.queryByText(warning)).not.toBeInTheDocument();
    });

    it('deletes an active look after confirmation', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await screen.findByRole('heading', { name: 'Look löschen' });
      await userEvent.click(deleteButton());
      await userEvent.click(
        screen.getByRole('button', { name: 'Endgültig löschen' })
      );
      expect(
        await screen.findByRole('heading', { name: 'Looks', level: 1 })
      ).toBeInTheDocument();
      expect(fake.discounts.size).toBe(0);
      expect(fake.objects.size).toBe(0);
    });

    it('disables the button without Manage permission but keeps it visible', async () => {
      renderLooks({ api: inactiveSeed().api, path: '/a', canManage: false });
      await screen.findByRole('heading', { name: 'Look löschen' });
      expect(deleteButton()).toBeDisabled();
    });

    it('enables the button for an inactive look and asks first; cancel writes nothing', async () => {
      const fake = inactiveSeed();
      renderLooks({ api: fake.api, path: '/a' });
      await screen.findByRole('heading', { name: 'Look löschen' });
      expect(deleteButton()).toBeEnabled();
      await userEvent.click(deleteButton());
      expect(
        screen.getByText('Look „a de“ endgültig löschen?')
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
      expect(
        screen.queryByText('Look „a de“ endgültig löschen?')
      ).not.toBeInTheDocument();
      expect(deleteButton()).toBeEnabled();
      expect(fake.calls.filter((c) => c.method.startsWith('delete'))).toEqual(
        []
      );
    });

    it('deletes the look after confirmation and returns to the list', async () => {
      const fake = inactiveSeed();
      renderLooks({ api: fake.api, path: '/a' });
      await screen.findByRole('heading', { name: 'Look löschen' });
      await userEvent.click(deleteButton());
      await userEvent.click(
        screen.getByRole('button', { name: 'Endgültig löschen' })
      );
      expect(
        await screen.findByRole('heading', { name: 'Looks', level: 1 })
      ).toBeInTheDocument();
      expect(fake.discounts.size).toBe(0);
      expect(fake.groups.size).toBe(0);
      expect(fake.objects.size).toBe(0);
      expect(
        (await screen.findAllByText('Look „a de“ gelöscht')).length
      ).toBeGreaterThan(0);
    });

    it('shows the error, keeps the page and reloads what is left', async () => {
      const fake = inactiveSeed();
      fake.failNext(
        'deleteDiscountGroup',
        new LookApiError('deleteLook', 'conflict', undefined, {
          statusCode: 409,
        })
      );
      renderLooks({ api: fake.api, path: '/a' });
      await screen.findByRole('heading', { name: 'Look löschen' });
      const fetchesBefore = fake.callsTo('getLookObject').length;
      await userEvent.click(deleteButton());
      await userEvent.click(
        screen.getByRole('button', { name: 'Endgültig löschen' })
      );
      expect(
        await screen.findByText(
          'Look löschen: Die Daten wurden inzwischen geändert. Bitte neu laden.'
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Looks', level: 1 })
      ).not.toBeInTheDocument();
      expect(fake.groups.size).toBe(1);
      expect(fake.objects.size).toBe(1);
      await waitFor(() =>
        expect(fake.callsTo('getLookObject').length).toBeGreaterThan(
          fetchesBefore
        )
      );
      await waitFor(() => expect(deleteButton()).toBeEnabled());
    });
  });
});
