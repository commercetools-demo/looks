import userEvent from '@testing-library/user-event';
import { config } from '../../config';
import { createFakeLookApi } from '../../test-utils/fake-look-api';
import {
  buildDiscount,
  buildObject,
  buildPiece,
} from '../../test-utils/fixtures';
import { waitFor } from '@testing-library/react';
import { renderLooks, screen } from '../../test-utils';
import { measureImage } from './measure-image';

jest.mock('./measure-image', () => ({ measureImage: jest.fn() }));
const measure = measureImage as jest.MockedFunction<typeof measureImage>;

const ids = ['p1', 'p2', 'p3', 'p4', 'p5'];
const pieces = ids.map((id) => buildPiece(id));

function seed(
  options: {
    pieceIds?: string[];
    pieces?: ReturnType<typeof buildPiece>[];
    setPrice?: Record<string, number>;
    amount?: Record<string, number>;
    image?: { path: string; width: number; height: number };
  } = {}
) {
  const pieceIds = options.pieceIds ?? ['p1', 'p2'];
  return createFakeLookApi({
    objects: [
      buildObject('a', pieceIds, {
        ...(options.setPrice ? { setPrice: options.setPrice } : {}),
        ...(options.image ? { image: options.image } : {}),
      }),
    ],
    discounts: [
      buildDiscount(
        'a',
        pieceIds,
        options.amount ? { amount: options.amount } : {}
      ),
    ],
    pieces: options.pieces ?? pieces,
  });
}

const eur = () => screen.findByRole('textbox', { name: 'Setpreis in EUR' });

async function enterPrices(values: Record<string, string>) {
  for (const [currency, text] of Object.entries(values)) {
    const input = await screen.findByRole('textbox', {
      name: `Setpreis in ${currency}`,
    });
    await userEvent.clear(input);
    await userEvent.type(input, text);
  }
}

const savePrice = () =>
  userEvent.click(screen.getByRole('button', { name: 'Setpreis speichern' }));

describe('look detail', () => {
  const origin = config.shopOrigin;
  afterEach(() => {
    config.shopOrigin = origin;
    measure.mockReset();
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
    it('US5.1: shows all five cards of a five-piece look', async () => {
      renderLooks({
        api: seed({
          pieceIds: ids,
          setPrice: { EUR: 40000, CHF: 44000 },
          amount: { EUR: 10000, CHF: 11000 },
        }).api,
        path: '/a',
      });
      expect(await screen.findByText('Teile (5)')).toBeInTheDocument();
      for (const id of ids)
        expect(screen.getAllByText(`Piece ${id}`).length).toBeGreaterThan(0);
    });

    it('shows price per currency and colour on the card', async () => {
      renderLooks({ api: seed().api, path: '/a' });
      await screen.findByText('Teile (2)');
      expect(screen.getAllByText(/100,00\s€/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/110,00\sCHF/).length).toBeGreaterThan(0);
      expect(screen.getAllByText('braun')).toHaveLength(2);
    });

    it('US5.2: one size left shows quantities and sold out, without warning', async () => {
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
      expect(screen.getByText('42: 9')).toBeInTheDocument();
      expect(screen.getByText('36, 40: ausverkauft')).toBeInTheDocument();
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
      expect(await screen.findByText('Einheitsgröße: 4')).toBeInTheDocument();
    });

    it('shows no look photo when there is none', async () => {
      renderLooks({ api: seed().api, path: '/a' });
      await screen.findByText('Teile (2)');
      expect(
        screen.queryByRole('img', { name: 'a de' })
      ).not.toBeInTheDocument();
    });

    it('shows the look photo with the look name as alt text', async () => {
      config.shopOrigin = 'https://shop.example.com';
      const image = { path: 'looks/a.webp', width: 800, height: 1200 };
      renderLooks({ api: seed({ image }).api, path: '/a' });
      const photo = await screen.findByRole('img', { name: 'a de' });
      expect(photo).toHaveAttribute(
        'src',
        'https://shop.example.com/looks/a.webp'
      );
    });
  });

  describe('set price', () => {
    it('prefills the stored set price and shows sum and saving', async () => {
      renderLooks({ api: seed().api, path: '/a' });
      expect(await eur()).toHaveValue('180,00');
      expect(
        screen.getByRole('textbox', { name: 'Setpreis in CHF' })
      ).toHaveValue('198,00');
      expect(
        screen.getByText(/Summe der Einzelpreise: 200,00\s€/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Ersparnis: 20,00\s€ \(10 %\)/)
      ).toBeInTheDocument();
    });

    it('US5.3: recomputes the discount first, then the definition, and confirms', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await enterPrices({ EUR: '170,00', CHF: '187.00' });
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
      expect(await eur()).toHaveValue('170,00');
    });

    it('writes nothing and says "Keine Änderung" when the price is unchanged', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await eur();
      await savePrice();
      expect(await screen.findByText('Keine Änderung')).toBeInTheDocument();
      expect(fake.callsTo('updateCartDiscount')).toHaveLength(0);
      expect(fake.callsTo('writeLookObject')).toHaveLength(0);
    });

    it('refuses a set price that is not below the sum', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await enterPrices({ EUR: '200', CHF: '100' });
      await savePrice();
      expect(
        await screen.findByText(/muss unter der Summe der Einzelpreise liegen/)
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
      expect(
        screen.getByRole('textbox', { name: 'Setpreis in CHF' })
      ).toHaveValue('');
    });

    it('works with a single project currency', async () => {
      const fake = createFakeLookApi({
        objects: [buildObject('a', ['p1', 'p2'], { setPrice: { EUR: 18000 } })],
        discounts: [
          buildDiscount('a', ['p1', 'p2'], { amount: { EUR: 2000 } }),
        ],
        pieces,
      });
      renderLooks({ api: fake.api, path: '/a', currencies: ['EUR'] });
      await enterPrices({ EUR: '150' });
      expect(
        screen.queryByRole('textbox', { name: 'Setpreis in CHF' })
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
          buildDiscount('a', ['p1', 'p2'], {
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
      expect(
        screen.getByRole('textbox', { name: 'Setpreis in USD' })
      ).toHaveValue('200');
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
  });

  describe('photo', () => {
    beforeEach(() => {
      config.shopOrigin = 'https://shop.example.com';
    });
    const photoField = () =>
      screen.findByRole('textbox', { name: 'Look-Foto (Pfad)' });
    const savePhoto = () =>
      userEvent.click(screen.getByRole('button', { name: 'Foto speichern' }));

    it('US5.6: saves a valid, loadable photo with its size', async () => {
      measure.mockResolvedValue({ width: 800, height: 1200 });
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await userEvent.type(await photoField(), 'looks/a.webp');
      await savePhoto();
      expect(await screen.findAllByText('Foto gespeichert')).not.toHaveLength(
        0
      );
      expect(measure).toHaveBeenCalledWith(
        'https://shop.example.com/looks/a.webp'
      );
      expect(fake.objects.get('look-a')?.value.image).toEqual({
        path: 'looks/a.webp',
        width: 800,
        height: 1200,
      });
    });

    it('US5.6: refuses an invalid path with a field error and writes nothing', async () => {
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await userEvent.type(await photoField(), 'elsewhere/a.gif');
      await savePhoto();
      expect(
        await screen.findByText(/Der Pfad muss die Form looks\/dateiname/)
      ).toBeInTheDocument();
      expect(measure).not.toHaveBeenCalled();
      expect(fake.callsTo('writeLookObject')).toHaveLength(0);
    });

    it('US5.6: refuses a photo that cannot be loaded', async () => {
      measure.mockRejectedValue(new Error('load'));
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a' });
      await userEvent.type(await photoField(), 'looks/missing.png');
      await savePhoto();
      expect(
        await screen.findByText('Das Foto konnte im Shop nicht geladen werden.')
      ).toBeInTheDocument();
      expect(fake.callsTo('writeLookObject')).toHaveLength(0);
    });

    it('US5.6: clearing the path removes the photo', async () => {
      const image = { path: 'looks/a.webp', width: 800, height: 1200 };
      const fake = seed({ image });
      renderLooks({ api: fake.api, path: '/a' });
      const field = await photoField();
      expect(field).toHaveValue('looks/a.webp');
      await userEvent.clear(field);
      await savePhoto();
      expect(await screen.findAllByText('Foto gespeichert')).not.toHaveLength(
        0
      );
      expect(fake.objects.get('look-a')?.value.image).toBeUndefined();
      expect(measure).not.toHaveBeenCalled();
    });

    it('is disabled with a hint when no shop origin is configured', async () => {
      config.shopOrigin = '';
      renderLooks({ api: seed().api, path: '/a' });
      expect(await photoField()).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Foto speichern' })
      ).toBeDisabled();
      expect(screen.getByText(/Ohne Shop-Adresse/)).toBeInTheDocument();
    });
  });

  describe('read-only access', () => {
    it('shows everything and disables every write control', async () => {
      config.shopOrigin = 'https://shop.example.com';
      const fake = seed();
      renderLooks({ api: fake.api, path: '/a', canManage: false });
      expect(await screen.findByText('Nur Lesezugriff')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'a de aktiv' })).toBeDisabled();
      expect(
        screen.getByRole('textbox', { name: 'Setpreis in EUR' })
      ).toBeDisabled();
      expect(
        screen.getByRole('textbox', { name: 'Setpreis in CHF' })
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Setpreis speichern' })
      ).toBeDisabled();
      expect(
        screen.getByRole('textbox', { name: 'Look-Foto (Pfad)' })
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Foto speichern' })
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
        screen.queryByRole('textbox', { name: 'Setpreis in EUR' })
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
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Name (Deutsch)' }),
        'Neuer Look'
      );
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Name (Englisch)' }),
        'New look'
      );
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
});
