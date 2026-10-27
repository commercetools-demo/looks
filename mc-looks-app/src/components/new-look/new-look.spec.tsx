/* eslint-disable testing-library/no-node-access -- the step indicator, the 2:3 photo frame and the result cards have no role to query */
import userEvent from '@testing-library/user-event';
import {
  screen,
  waitFor,
  within,
} from '@commercetools-frontend/application-shell/test-utils';
import { toast } from '@commercetools/nimbus';
import { config } from '../../config';
import { LookApiError } from '../../domain/errors';
import { measureImage } from '../../domain/image-size';
import { renderLooks, type RenderLooksOptions } from '../../test-utils';
import { createFakeLookApi } from '../../test-utils/fake-look-api';
import { buildPiece } from '../../test-utils/fixtures';

jest.mock('../../domain/image-size', () => ({ measureImage: jest.fn() }));
const measure = measureImage as jest.MockedFunction<typeof measureImage>;

type User = ReturnType<typeof userEvent.setup>;

const jacket = buildPiece('jacket', {
  name: 'Jacke Cleo',
  colour: 'camel',
  prices: { EUR: 12999, CHF: 14290, USD: 13999 },
});
const trousers = buildPiece('trousers', {
  name: 'Hose Bea',
  prices: { EUR: 7999, CHF: 8790, USD: 8499 },
});
const scarf = buildPiece('scarf', {
  name: 'Schal Dora',
  oneSize: true,
  sizes: [{ label: '', availableQuantity: 8 }],
  prices: { EUR: 3999, CHF: 4390, USD: 4299 },
});
const coat = buildPiece('coat', {
  name: 'Mantel Eva',
  sizes: [
    { label: '36', availableQuantity: 0 },
    { label: '38', availableQuantity: 0 },
  ],
  soldOutEverywhere: true,
  prices: { EUR: 19999, CHF: 21990, USD: 20999 },
});
const belt = buildPiece('belt', {
  name: 'Gürtel Fay',
  prices: { EUR: 2999, USD: 3299 },
});
const extras = ['a', 'b', 'c', 'd'].map((id) =>
  buildPiece(`extra-${id}`, {
    name: `Extra ${id}`,
    prices: { EUR: 1000, CHF: 1100, USD: 1200 },
  })
);

const SHOP = 'https://shop.example.com';

function setup(
  options: Partial<Omit<RenderLooksOptions, 'api'>> & {
    pieces?: ReturnType<typeof buildPiece>[];
    prepare?: (fake: ReturnType<typeof createFakeLookApi>) => void;
  } = {}
) {
  const {
    pieces = [jacket, trousers, scarf, coat, belt],
    prepare,
    ...rest
  } = options;
  const fake = createFakeLookApi({ pieces });
  prepare?.(fake);
  const view = renderLooks({ api: fake.api, path: '/new', ...rest });
  return { fake, ...view };
}

const next = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Weiter' }));

async function fillBasics(
  user: User,
  names = { de: 'Jacken-Look', en: 'Jacket look' }
) {
  await user.type(
    await screen.findByRole('textbox', { name: 'Name (Deutsch)' }),
    names.de
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Name (Englisch)' }),
    names.en
  );
}

async function addPiece(user: User, name: string) {
  const results = await screen.findByRole('list', { name: 'Suchergebnisse' });
  await user.click(
    within(results).getByRole('button', {
      name: new RegExp(`^Hinzufügen: ${name}`),
    })
  );
}

async function gotoPieces(user: User) {
  await fillBasics(user);
  await next(user);
  await screen.findByRole('heading', { name: 'Teile wählen (2 bis 5)' });
}

async function gotoSetPrice(user: User, names = ['Jacke Cleo', 'Hose Bea']) {
  await gotoPieces(user);
  for (const name of names) await addPiece(user, name);
  await next(user);
  await screen.findByRole('textbox', { name: 'Setpreis EUR' });
}

const typeAmount = async (user: User, currency: string, amount: string) => {
  const input = screen.getByRole('textbox', { name: `Setpreis ${currency}` });
  await user.clear(input);
  await user.type(input, amount);
};

async function gotoReview(user: User) {
  await gotoSetPrice(user);
  await typeAmount(user, 'EUR', '189,90');
  await typeAmount(user, 'CHF', '209,90');
  await next(user);
  await screen.findByRole('switch', { name: 'Nach dem Anlegen aktiv' });
}

const writes = (fake: ReturnType<typeof createFakeLookApi>) => [
  ...fake.callsTo('createCartDiscount'),
  ...fake.callsTo('writeLookObject'),
  ...fake.callsTo('updateCartDiscount'),
];

beforeEach(() => {
  config.shopOrigin = SHOP;
  measure.mockReset();
  measure.mockResolvedValue({ width: 800, height: 1200 });
});
afterEach(() => {
  config.shopOrigin = '';
  toast.remove();
});

describe('Neuer Look: step 1, basics', () => {
  it('marks the current step and names all four steps', async () => {
    const user = userEvent.setup();
    setup();
    await fillBasics(user);
    await next(user);
    await screen.findByRole('heading', { name: /Teile wählen/ });
    for (const title of ['Grunddaten', 'Teile', 'Setpreis', 'Prüfen']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    const indicators = document.querySelectorAll('[data-part="indicator"]');
    expect(indicators).toHaveLength(4);
    expect(indicators[0]).not.toHaveAttribute('data-state');
    expect(indicators[1]).toHaveAttribute('data-state', 'open');
    expect(indicators[2]).not.toHaveAttribute('data-state');
  });

  it('scenario 1: refuses missing names with field errors and writes nothing; names open step 2', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await screen.findByRole('textbox', { name: 'Name (Deutsch)' });
    await next(user);
    expect(
      await screen.findByText('Bitte den deutschen Namen angeben.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Bitte den englischen Namen angeben.')
    ).toBeInTheDocument();
    expect(writes(fake)).toHaveLength(0);
    await fillBasics(user);
    await next(user);
    expect(
      await screen.findByRole('heading', { name: 'Teile wählen (2 bis 5)' })
    ).toBeInTheDocument();
  });

  it('scenario 2: loads a valid photo from the shop and shows it 120 px wide in 2:3, also in the preview later', async () => {
    const user = userEvent.setup();
    setup();
    await fillBasics(user);
    await user.type(
      screen.getByRole('textbox', { name: /^Look-Foto/ }),
      'looks/jacket.webp'
    );
    const photo = await screen.findByTestId('step1-photo');
    expect(measure).toHaveBeenCalledWith(
      `${SHOP}/looks/jacket.webp`,
      undefined
    );
    const frame = photo.querySelector('[data-look-photo]') as HTMLElement;
    expect(frame).toHaveStyle({ width: '120px', aspectRatio: '2 / 3' });
    expect(
      within(photo).getByRole('img', { name: 'Look-Foto, Vorschau' })
    ).toHaveAttribute('src', `${SHOP}/looks/jacket.webp`);
    expect(
      screen.getByText('Hochformat, das Model trägt den Look')
    ).toBeInTheDocument();
    await next(user);
    await screen.findByRole('heading', { name: /Teile wählen/ });
    await addPiece(user, 'Jacke Cleo');
    const preview = await screen.findByTestId('preview-photo');
    expect(within(preview).getByRole('img')).toHaveAttribute(
      'src',
      `${SHOP}/looks/jacket.webp`
    );
  });

  it('scenario 2: an invalid path or a photo that cannot be loaded keeps step 1 with a field error', async () => {
    const user = userEvent.setup();
    setup();
    await fillBasics(user);
    const field = screen.getByRole('textbox', { name: /^Look-Foto/ });
    await user.type(field, 'bilder/jacke.gif');
    await next(user);
    expect(
      await screen.findByText(
        /Der Pfad muss die Form looks\/<name>\.webp haben/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Name (Deutsch)' })
    ).toBeInTheDocument();

    await user.clear(field);
    measure.mockRejectedValue(new Error('404'));
    await user.type(field, 'looks/gone.png');
    await next(user);
    expect(
      await screen.findByText(
        'Das Foto konnte nicht aus dem Shop geladen werden.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Teile wählen/ })
    ).not.toBeInTheDocument();
  });

  it('scenario 2: an empty photo field is valid', async () => {
    const user = userEvent.setup();
    setup();
    await fillBasics(user);
    await next(user);
    expect(
      await screen.findByRole('heading', { name: /Teile wählen/ })
    ).toBeInTheDocument();
    expect(measure).not.toHaveBeenCalled();
  });

  it('disables the photo field with a hint without a shop origin', async () => {
    config.shopOrigin = '';
    setup();
    const field = await screen.findByRole('textbox', { name: /^Look-Foto/ });
    expect(field).toBeDisabled();
    expect(
      screen.getByText(/Ohne Shop-Adresse kann das Foto nicht geprüft werden/)
    ).toBeInTheDocument();
  });

  it('keeps what was entered when moving back and forth', async () => {
    const user = userEvent.setup();
    setup();
    await gotoPieces(user);
    await addPiece(user, 'Jacke Cleo');
    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(
      await screen.findByRole('textbox', { name: 'Name (Deutsch)' })
    ).toHaveValue('Jacken-Look');
    expect(
      screen.getByRole('textbox', { name: 'Name (Englisch)' })
    ).toHaveValue('Jacket look');
    await next(user);
    expect(await screen.findByTestId('pieces-chosen')).toHaveTextContent(
      /1 Teil gewählt/
    );
  });

  it('closes with Abbrechen', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByRole('button', { name: 'Abbrechen' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Weiter' })
      ).not.toBeInTheDocument()
    );
  });
});

describe('Neuer Look: step 2, pieces', () => {
  it('scenario 3: finds products with image, name, colour, prices and sizes; adds them and states count and sum', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await gotoPieces(user);
    const results = await screen.findByRole('list', { name: 'Suchergebnisse' });
    expect(fake.callsTo('searchPieces')[0].args).toEqual(['']);
    const card = within(results).getAllByRole('listitem')[0];
    expect(within(card).getByText('Jacke Cleo')).toBeInTheDocument();
    expect(within(card).getByText('camel')).toBeInTheDocument();
    expect(
      within(card).getByText(/129,99\s€ \/ 142,90\sCHF/)
    ).toBeInTheDocument();
    expect(within(card).getByText('36')).toBeInTheDocument();
    expect(within(card).getByText('38: nur noch 2')).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', { name: 'Produktsuche' }),
      'hose'
    );
    await waitFor(() =>
      expect(fake.callsTo('searchPieces').at(-1)?.args).toEqual(['hose'])
    );
    await waitFor(() =>
      expect(
        within(
          screen.getByRole('list', { name: 'Suchergebnisse' })
        ).getAllByRole('listitem')
      ).toHaveLength(1)
    );
    await addPiece(user, 'Hose Bea');
    await user.clear(screen.getByRole('searchbox', { name: 'Produktsuche' }));
    await addPiece(user, 'Jacke Cleo');
    expect(await screen.findByTestId('pieces-chosen')).toHaveTextContent(
      '2 Teile gewählt. Summe der Teile: 209,98 € / 230,80 CHF'
    );
    // Added pieces read "Im Look" instead of an add button.
    const again = within(
      await screen.findByRole('list', { name: 'Suchergebnisse' })
    );
    expect(
      again.queryByRole('button', { name: /^Hinzufügen: Jacke Cleo/ })
    ).not.toBeInTheDocument();
  });

  it('shows the sum in a single currency when the project has one', async () => {
    const user = userEvent.setup();
    setup({ currencies: ['EUR'] });
    await gotoPieces(user);
    await addPiece(user, 'Jacke Cleo');
    await addPiece(user, 'Hose Bea');
    expect(await screen.findByTestId('pieces-chosen')).toHaveTextContent(
      '2 Teile gewählt. Summe der Teile: 209,98 €'
    );
  });

  it('scenario 4: refuses fewer than two pieces naming limit and count; at most five can be added', async () => {
    const user = userEvent.setup();
    const { fake } = setup({
      pieces: [jacket, trousers, scarf, coat, ...extras],
    });
    await gotoPieces(user);
    await next(user);
    expect(
      await screen.findByText(
        'Ein Look braucht mindestens 2 Teile, gewählt sind 0.'
      )
    ).toBeInTheDocument();
    await addPiece(user, 'Jacke Cleo');
    await next(user);
    expect(
      await screen.findByText(
        'Ein Look braucht mindestens 2 Teile, gewählt sind 1.'
      )
    ).toBeInTheDocument();
    for (const name of ['Hose Bea', 'Schal Dora', 'Mantel Eva', 'Extra a']) {
      await addPiece(user, name);
    }
    const results = within(
      screen.getByRole('list', { name: 'Suchergebnisse' })
    );
    expect(
      results.getByRole('button', { name: /^Hinzufügen: Extra b/ })
    ).toBeDisabled();
    expect(writes(fake)).toHaveLength(0);
  });

  it('scenario 5: a piece without sizes reads "Einheitsgröße"', async () => {
    const user = userEvent.setup();
    setup();
    await gotoPieces(user);
    const results = await screen.findByRole('list', { name: 'Suchergebnisse' });
    const card = within(results)
      .getByText('Schal Dora')
      .closest('[role="listitem"]') as HTMLElement;
    expect(within(card).getByText('Einheitsgröße')).toBeInTheDocument();
  });

  it('scenario 6: warns about a piece sold out everywhere, without blocking', async () => {
    const user = userEvent.setup();
    setup();
    await gotoPieces(user);
    const results = await screen.findByRole('list', { name: 'Suchergebnisse' });
    const card = within(results)
      .getByText('Mantel Eva')
      .closest('[role="listitem"]') as HTMLElement;
    expect(within(card).getByText('ausverkauft: 36, 38')).toBeInTheDocument();
    await addPiece(user, 'Mantel Eva');
    await addPiece(user, 'Hose Bea');
    expect(
      await screen.findByText('Mantel Eva ist in allen Größen ausverkauft')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Das Speichern ist trotzdem möglich/)
    ).toBeInTheDocument();
    await next(user);
    expect(
      await screen.findByRole('textbox', { name: 'Setpreis EUR' })
    ).toBeInTheDocument();
  });

  it('scenario 8: refuses a piece without a list price in a project currency, naming piece and currency', async () => {
    const user = userEvent.setup();
    setup();
    await gotoPieces(user);
    await addPiece(user, 'Jacke Cleo');
    await addPiece(user, 'Gürtel Fay');
    await next(user);
    expect(
      await screen.findByText('Gürtel Fay hat keinen Preis in CHF.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Setpreis EUR' })
    ).not.toBeInTheDocument();
  });

  it('reorders the chosen pieces with the up and down buttons', async () => {
    const user = userEvent.setup();
    setup();
    await gotoPieces(user);
    await addPiece(user, 'Jacke Cleo');
    await addPiece(user, 'Hose Bea');
    await addPiece(user, 'Schal Dora');
    const chosen = () =>
      within(screen.getByRole('grid', { name: 'Gewählte Teile' }))
        .getAllByRole('row')
        .map((row) =>
          ['Jacke Cleo', 'Hose Bea', 'Schal Dora'].find((n) =>
            within(row).queryByText(n)
          )
        );
    expect(chosen()).toEqual(['Jacke Cleo', 'Hose Bea', 'Schal Dora']);
    expect(
      screen.getByRole('button', { name: 'Nach oben: Jacke Cleo' })
    ).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: 'Nach unten: Jacke Cleo' })
    );
    expect(chosen()).toEqual(['Hose Bea', 'Jacke Cleo', 'Schal Dora']);
    await user.click(
      screen.getByRole('button', { name: 'Nach oben: Schal Dora' })
    );
    expect(chosen()).toEqual(['Hose Bea', 'Schal Dora', 'Jacke Cleo']);
    await user.click(
      screen.getByRole('button', { name: 'Entfernen: Hose Bea' })
    );
    expect(chosen()).toEqual(['Schal Dora', 'Jacke Cleo']);
  });

  it('shows the preview beside the form with "Setpreis folgt" until a set price is entered', async () => {
    const user = userEvent.setup();
    setup();
    await gotoPieces(user);
    expect(screen.getByTestId('shop-preview-placeholder')).toBeInTheDocument();
    await addPiece(user, 'Jacke Cleo');
    const preview = await screen.findByTestId('shop-preview');
    expect(within(preview).getByText('Setpreis folgt')).toBeInTheDocument();
    expect(within(preview).getByText('Jacke Cleo')).toBeInTheDocument();
    expect(screen.getByText('Shop-Vorschau')).toBeInTheDocument();
  });
});

describe('Neuer Look: step 3, set price', () => {
  it('scenario 7: refuses zero and a price at or above the sum, naming the currency', async () => {
    const user = userEvent.setup();
    setup();
    await gotoSetPrice(user);
    await typeAmount(user, 'EUR', '0');
    await typeAmount(user, 'CHF', '230,80');
    await next(user);
    expect(
      await screen.findByText('EUR: Der Setpreis muss größer als 0 sein.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /CHF: Der Setpreis muss unter der Summe der Teile \(230,80\sCHF\) liegen\./
      )
    ).toBeInTheDocument();
  });

  it('shows the live sum and saving per currency and accepts comma and dot', async () => {
    const user = userEvent.setup();
    setup();
    await gotoSetPrice(user);
    expect(
      screen.getByText(/EUR: Summe der Teile 209,98\s€/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/CHF: Summe der Teile 230,80\sCHF/)
    ).toBeInTheDocument();
    await typeAmount(user, 'EUR', '189.9');
    expect(
      await screen.findByText(/Ersparnis 20,08\s€ \(10 %\)/)
    ).toBeInTheDocument();
    await typeAmount(user, 'CHF', '209,90');
    await next(user);
    expect(
      await screen.findByRole('switch', { name: 'Nach dem Anlegen aktiv' })
    ).toBeInTheDocument();
  });

  it('refuses an amount that is not a number', async () => {
    const user = userEvent.setup();
    setup();
    await gotoSetPrice(user);
    await typeAmount(user, 'EUR', 'abc');
    await typeAmount(user, 'CHF', '1');
    await next(user);
    expect(
      await screen.findByText('EUR: Bitte einen Betrag wie 189,90 eingeben.')
    ).toBeInTheDocument();
  });

  it('shows one input for a project with one currency and one per currency with three', async () => {
    const user = userEvent.setup();
    const { unmount } = setup({ currencies: ['EUR'] });
    await gotoSetPrice(user);
    expect(screen.getAllByRole('textbox', { name: /^Setpreis/ })).toHaveLength(
      1
    );
    unmount();

    setup({ currencies: ['EUR', 'CHF', 'USD'] });
    await gotoSetPrice(user);
    expect(screen.getAllByRole('textbox', { name: /^Setpreis/ })).toHaveLength(
      3
    );
    expect(
      screen.getByRole('textbox', { name: 'Setpreis USD' })
    ).toBeInTheDocument();
  });
});

describe('Neuer Look: step 4, review and save', () => {
  it('scenario 9: saves inactive by default: discount then object, no activation, toast says inactive', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await gotoReview(user);
    expect(
      screen.getByRole('switch', { name: 'Nach dem Anlegen aktiv' })
    ).not.toBeChecked();
    expect(screen.getByText('Jacken-Look / Jacket look')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));

    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    expect(
      screen.getByText(/ist inaktiv und kann in der Liste eingeschaltet werden/)
    ).toBeInTheDocument();
    expect(writes(fake).map((call) => call.method)).toEqual([
      'createCartDiscount',
      'writeLookObject',
    ]);
    const discount = [...fake.discounts.values()][0];
    expect(discount).toMatchObject({
      key: 'look-jacket-look',
      isActive: false,
      amount: { EUR: 12999 + 7999 - 18990, CHF: 14290 + 8790 - 20990 },
      pieceIds: ['jacket', 'trousers'],
    });
    expect(fake.objects.get('look-jacket-look')?.value).toEqual({
      componentProductIds: ['jacket', 'trousers'],
      setPrice: { EUR: 18990, CHF: 20990 },
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Look speichern' })
      ).not.toBeInTheDocument()
    );
  });

  it('scenario 9: with "Nach dem Anlegen aktiv" on, the look is live right after saving', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await gotoReview(user);
    await user.click(
      screen.getByRole('switch', { name: 'Nach dem Anlegen aktiv' })
    );
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    expect(writes(fake).map((call) => call.method)).toEqual([
      'createCartDiscount',
      'writeLookObject',
      'updateCartDiscount',
    ]);
    expect([...fake.discounts.values()][0].isActive).toBe(true);
    expect(screen.queryByText(/ist inaktiv und kann/)).not.toBeInTheDocument();
  });

  it('saves the photo with its pixel size', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await fillBasics(user);
    await user.type(
      screen.getByRole('textbox', { name: /^Look-Foto/ }),
      'looks/jacket.webp'
    );
    await next(user);
    await screen.findByRole('heading', { name: /Teile wählen/ });
    await addPiece(user, 'Jacke Cleo');
    await addPiece(user, 'Hose Bea');
    await next(user);
    await typeAmount(user, 'EUR', '189,90');
    await typeAmount(user, 'CHF', '209,90');
    await next(user);
    await user.click(
      await screen.findByRole('button', { name: 'Look speichern' })
    );
    await screen.findByText('Look gespeichert');
    expect(fake.objects.get('look-jacket-look')?.value.image).toEqual({
      path: 'looks/jacket.webp',
      width: 800,
      height: 1200,
    });
  });

  it('writes one amount per currency for a project with three currencies', async () => {
    const user = userEvent.setup();
    const { fake } = setup({ currencies: ['EUR', 'CHF', 'USD'] });
    await gotoSetPrice(user);
    await typeAmount(user, 'EUR', '189,90');
    await typeAmount(user, 'CHF', '209,90');
    await typeAmount(user, 'USD', '199');
    await next(user);
    await user.click(
      await screen.findByRole('button', { name: 'Look speichern' })
    );
    await screen.findByText('Look gespeichert');
    expect(fake.objects.get('look-jacket-look')?.value.setPrice).toEqual({
      EUR: 18990,
      CHF: 20990,
      USD: 19900,
    });
  });

  it('shows the failed step and resumes without a duplicate', async () => {
    const user = userEvent.setup();
    const { fake } = setup({
      prepare: (f) =>
        f.failNext(
          'writeLookObject',
          new LookApiError('writeLookObject', 'network', undefined, {
            message: 'offline',
          })
        ),
    });
    await gotoReview(user);
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));
    expect(
      await screen.findByText('Der Look ist nur teilweise gespeichert')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Fehlgeschlagen ist der Schritt: Look-Definition speichern.'
      )
    ).toBeInTheDocument();
    expect(fake.discounts.size).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    expect(fake.discounts.size).toBe(1);
    expect(fake.callsTo('createCartDiscount')).toHaveLength(1);
    expect(fake.objects.has('look-jacket-look')).toBe(true);
  });

  it('re-plans instead of resuming when the input changed after a failure', async () => {
    const user = userEvent.setup();
    const { fake } = setup({ prepare: (f) => f.failNext('writeLookObject') });
    await gotoReview(user);
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));
    await screen.findByText('Der Look ist nur teilweise gespeichert');
    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    await typeAmount(user, 'EUR', '180');
    await next(user);
    await user.click(
      await screen.findByRole('button', { name: 'Look speichern' })
    );
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    expect(fake.callsTo('createCartDiscount')).toHaveLength(2);
  });

  it('keeps the activation failure visible and resumes only the activation', async () => {
    const user = userEvent.setup();
    const { fake } = setup({
      prepare: (f) => f.failNext('updateCartDiscount'),
    });
    await gotoReview(user);
    await user.click(
      screen.getByRole('switch', { name: 'Nach dem Anlegen aktiv' })
    );
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));
    expect(
      await screen.findByText(
        'Fehlgeschlagen ist der Schritt: Look aktivieren.'
      )
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    expect(fake.callsTo('createCartDiscount')).toHaveLength(1);
    expect(fake.callsTo('writeLookObject')).toHaveLength(1);
    expect([...fake.discounts.values()][0].isActive).toBe(true);
  });
});

describe('Neuer Look: permissions and language', () => {
  it('disables every write control without Manage and says so', async () => {
    const user = userEvent.setup();
    setup({ canManage: false });
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Nur Lesezugriff')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Name (Deutsch)' })
    ).toBeDisabled();
    expect(
      screen.getByRole('textbox', { name: 'Name (Englisch)' })
    ).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /^Look-Foto/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(
      await screen.findByText('Bitte den deutschen Namen angeben.')
    ).toBeInTheDocument();
  });

  it('keeps the preview card German under an English profile while the labels follow the language', async () => {
    const user = userEvent.setup();
    setup({ locale: 'en' });
    await user.type(
      await screen.findByRole('textbox', { name: 'Name (German)' }),
      'Jacken-Look'
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Name (English)' }),
      'Jacket look'
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    const results = await screen.findByRole('list', { name: 'Search results' });
    await user.click(
      within(results).getByRole('button', { name: /^Add: Jacke Cleo/ })
    );
    const preview = await screen.findByTestId('shop-preview');
    expect(within(preview).getByText('Setpreis folgt')).toBeInTheDocument();
    expect(
      within(preview).getByRole('button', { name: 'Set in den Warenkorb' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('How the look appears in the shop')
    ).toBeInTheDocument();
  });
});
