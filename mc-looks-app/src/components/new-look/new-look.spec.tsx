/* eslint-disable testing-library/no-node-access -- the step indicator and the result cards have no role to query */
import userEvent from '@testing-library/user-event';
import {
  act,
  screen,
  waitFor,
  within,
} from '@commercetools-frontend/application-shell/test-utils';
import { toast } from '@commercetools/nimbus';
import { LookApiError } from '../../domain/errors';
import { renderLooks, type RenderLooksOptions } from '../../test-utils';
import { createFakeLookApi } from '../../test-utils/fake-look-api';
import {
  buildDiscount,
  buildObject,
  buildPiece,
} from '../../test-utils/fixtures';
import {
  expandNameField,
  fillLookName,
  nameInput,
} from '../../test-utils/names';

type User = ReturnType<typeof userEvent.setup>;

const jacket = buildPiece('jacket', {
  name: 'Jacke Cleo',
  colour: 'camel',
  prices: { EUR: 12999, CHF: 14290 },
});
const trousers = buildPiece('trousers', {
  name: 'Hose Bea',
  prices: { EUR: 7999, CHF: 8790 },
});
const scarf = buildPiece('scarf', {
  name: 'Schal Dora',
  oneSize: true,
  sizes: [{ label: '', availableQuantity: 8 }],
  prices: { EUR: 3999, CHF: 4390 },
});
const coat = buildPiece('coat', {
  name: 'Mantel Eva',
  sizes: [
    { label: '36', availableQuantity: 0 },
    { label: '38', availableQuantity: 0 },
  ],
  soldOutEverywhere: true,
  prices: { EUR: 19999, CHF: 21990 },
});
const belt = buildPiece('belt', {
  name: 'Gürtel Fay',
  prices: { EUR: 2999, USD: 3299 },
});
const extras = ['a', 'b', 'c', 'd'].map((id) =>
  buildPiece(`extra-${id}`, {
    name: `Extra ${id}`,
    prices: { EUR: 1000, CHF: 1100 },
  })
);

// Prices per currency and country: the cell key is `EUR/DE`.
const shirt = buildPiece('shirt', {
  name: 'Hemd Ida',
  prices: { 'EUR/DE': 10000, 'EUR/FR': 10500, 'GBP/GB': 9000 },
});
const skirt = buildPiece('skirt', {
  name: 'Rock Lena',
  prices: { 'EUR/DE': 5000, 'EUR/FR': 5500, 'GBP/GB': 4500 },
});
const hat = buildPiece('hat', {
  name: 'Hut Mia',
  prices: { 'EUR/DE': 2000 },
});

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
  names: Record<string, string> = { de: 'Jacken-Look', en: 'Jacket look' }
) {
  await fillLookName(user, names);
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
  await screen.findByRole('heading', { name: 'Teile wählen (mindestens 2)' });
}

async function gotoSetPrice(user: User, names = ['Jacke Cleo', 'Hose Bea']) {
  await gotoPieces(user);
  for (const name of names) await addPiece(user, name);
  await next(user);
  await screen.findAllByRole('group', { name: /^Setpreis/ });
}

/** The amount field of a row; `label` is `EUR` or `EUR DE`. */
const amountInput = (label: string) =>
  within(screen.getByRole('group', { name: `Setpreis ${label}` })).getByRole(
    'textbox'
  );

const percentInput = (label: string) =>
  screen.getByRole('textbox', {
    name: new RegExp(`^Ersparnis in Prozent ${label}`),
  });

const typeAmount = async (user: User, label: string, amount: string) => {
  const input = amountInput(label);
  await user.clear(input);
  await user.type(input, amount);
  await user.tab();
};

async function gotoReview(user: User) {
  await gotoSetPrice(user);
  await typeAmount(user, 'EUR', '189,90');
  await typeAmount(user, 'CHF', '209,90');
  await next(user);
  await screen.findByRole('switch', { name: 'Nach dem Anlegen aktiv' });
}

const WRITE_METHODS = [
  'createDiscountGroup',
  'updateDiscountGroup',
  'createCartDiscount',
  'writeLookObject',
  'updateCartDiscount',
];

/** The write calls in the order they happened. */
const writes = (fake: ReturnType<typeof createFakeLookApi>) =>
  fake.calls.filter((call) => WRITE_METHODS.includes(call.method));

afterEach(() => {
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

  it('scenario 1: refuses a missing name with a field error and writes nothing; a name opens step 2', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await screen.findByRole('group', { name: /^Name/ });
    await next(user);
    expect(
      await screen.findByText('Bitte mindestens einen Namen eingeben.')
    ).toBeInTheDocument();
    expect(writes(fake)).toHaveLength(0);
    await fillBasics(user);
    await next(user);
    expect(
      await screen.findByRole('heading', {
        name: 'Teile wählen (mindestens 2)',
      })
    ).toBeInTheDocument();
  });

  it('keeps what was entered when moving back and forth', async () => {
    const user = userEvent.setup();
    setup();
    await gotoPieces(user);
    await addPiece(user, 'Jacke Cleo');
    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    await screen.findByRole('group', { name: /^Name/ });
    expect(nameInput('DE')).toHaveValue('Jacken-Look');
    await expandNameField(user);
    expect(nameInput('EN')).toHaveValue('Jacket look');
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
  it('scenario 3: finds products with image, name, colour and sizes, without prices; adds them and states the count', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await gotoPieces(user);
    const results = await screen.findByRole('list', { name: 'Suchergebnisse' });
    expect(fake.callsTo('searchPieces')[0].args).toEqual(['']);
    const card = within(results).getAllByRole('listitem')[0];
    expect(within(card).getByText('Jacke Cleo')).toBeInTheDocument();
    expect(within(card).getByText('camel')).toBeInTheDocument();
    expect(card).not.toHaveTextContent(/€|CHF/);
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
      '2 Teile gewählt'
    );
    // Added pieces read "Im Look" instead of an add button.
    const again = within(
      await screen.findByRole('list', { name: 'Suchergebnisse' })
    );
    expect(
      again.queryByRole('button', { name: /^Hinzufügen: Jacke Cleo/ })
    ).not.toBeInTheDocument();
  });

  it('states the count for a project with one currency', async () => {
    const user = userEvent.setup();
    setup({ currencies: ['EUR'] });
    await gotoPieces(user);
    await addPiece(user, 'Jacke Cleo');
    await addPiece(user, 'Hose Bea');
    expect(await screen.findByTestId('pieces-chosen')).toHaveTextContent(
      '2 Teile gewählt'
    );
  });

  it('scenario 4: refuses fewer than two pieces naming limit and count', async () => {
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
    expect(writes(fake)).toHaveLength(0);
  });

  it('has no maximum: a sixth and seventh piece can be added and saved with a pattern of all of them', async () => {
    const user = userEvent.setup();
    const { fake } = setup({
      pieces: [jacket, trousers, scarf, coat, ...extras],
    });
    await gotoPieces(user);
    const chosen = [
      'Jacke Cleo',
      'Hose Bea',
      'Schal Dora',
      'Mantel Eva',
      'Extra a',
      'Extra b',
      'Extra c',
    ];
    for (const name of chosen) {
      const results = within(
        await screen.findByRole('list', { name: 'Suchergebnisse' })
      );
      expect(
        results.getByRole('button', {
          name: new RegExp(`^Hinzufügen: ${name}`),
        })
      ).toBeEnabled();
      await addPiece(user, name);
    }
    expect(await screen.findByTestId('pieces-chosen')).toHaveTextContent(
      '7 Teile gewählt'
    );
    expect(
      within(screen.getByRole('list', { name: 'Suchergebnisse' })).getByRole(
        'button',
        { name: /^Hinzufügen: Extra d/ }
      )
    ).toBeEnabled();
    await next(user);
    await screen.findAllByRole('group', { name: /^Setpreis/ });
    await typeAmount(user, 'EUR', '50');
    await typeAmount(user, 'CHF', '55');
    await next(user);
    await screen.findByRole('switch', { name: 'Nach dem Anlegen aktiv' });
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    const draft = fake.callsTo('createCartDiscount')[0].args[0] as {
      target: { pattern: { targetPattern: unknown[] } };
    };
    expect(draft.target.pattern.targetPattern).toHaveLength(7);
    const object = fake.callsTo('writeLookObject')[0].args[0] as {
      value?: { componentProductIds?: string[] };
    };
    expect(JSON.stringify(object)).toContain('extra-c');
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
      await screen.findByRole('group', { name: 'Setpreis EUR' })
    ).toBeInTheDocument();
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

  it('shows one row per currency with the master prices and the sum, and starts at the sum', async () => {
    const user = userEvent.setup();
    setup();
    await gotoSetPrice(user);
    const row = within(screen.getByTestId('price-row-EUR'));
    expect(row.getByText(/129,99\s€/)).toBeInTheDocument();
    expect(row.getByText(/79,99\s€/)).toBeInTheDocument();
    expect(row.getByText(/209,98\s€/)).toBeInTheDocument();
    expect(row.getByText('ohne Land')).toBeInTheDocument();
    expect(amountInput('EUR')).toHaveValue('209,98');
    expect(
      within(screen.getByTestId('price-row-CHF')).getByText(/230,80\sCHF/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Summe' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Jacke Cleo' })
    ).toBeInTheDocument();
  });

  it('shows the saving in percent for a typed set price and accepts comma and dot', async () => {
    const user = userEvent.setup();
    setup();
    await gotoSetPrice(user);
    await typeAmount(user, 'EUR', '189,90');
    expect(percentInput('EUR')).toHaveValue('9,6');
    await typeAmount(user, 'CHF', '209,90');
    await next(user);
    expect(
      await screen.findByRole('switch', { name: 'Nach dem Anlegen aktiv' })
    ).toBeInTheDocument();
  });

  it('writes the set price when a saving in percent is typed', async () => {
    const user = userEvent.setup();
    setup();
    await gotoSetPrice(user);
    const percent = percentInput('EUR');
    await user.clear(percent);
    await user.type(percent, '10');
    await user.tab();
    // 209,98 minus 10 %
    expect(amountInput('EUR')).toHaveValue('188,98');
    expect(percent).toHaveValue('10');
  });

  it('leaves an emptied row without a discount and refuses when no row has a price', async () => {
    const user = userEvent.setup();
    setup();
    await gotoSetPrice(user);
    await user.clear(amountInput('EUR'));
    await user.tab();
    await user.clear(amountInput('CHF'));
    await user.tab();
    await next(user);
    expect(
      await screen.findByText(
        /Tragen Sie in mindestens einer Zeile einen Setpreis ein/
      )
    ).toBeInTheDocument();
  });

  it('goes on with one priced row and saves no discount for the emptied one', async () => {
    const user = userEvent.setup();
    setup();
    await gotoSetPrice(user);
    await typeAmount(user, 'EUR', '189,90');
    await user.clear(amountInput('CHF'));
    await user.tab();
    await next(user);
    expect(
      await screen.findByRole('switch', { name: 'Nach dem Anlegen aktiv' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/^CHF:/)).not.toBeInTheDocument();
  });

  it('names the sum of a country row that is not below it, without crashing', async () => {
    const user = userEvent.setup();
    setup({
      pieces: [
        buildPiece('a', { name: 'Jacke Cleo', prices: { 'EUR/DE': 10000 } }),
        buildPiece('b', { name: 'Hose Bea', prices: { 'EUR/DE': 20000 } }),
      ],
    });
    await gotoSetPrice(user);
    // The row starts at its sum, which is not below it.
    await next(user);
    expect(await screen.findByText(/EUR\/DE/)).toBeInTheDocument();
  });

  it('shows one row for pieces with one currency and one per currency with three', async () => {
    const user = userEvent.setup();
    const { unmount } = setup({
      pieces: [
        buildPiece('a', { name: 'Jacke Cleo', prices: { EUR: 1000 } }),
        buildPiece('b', { name: 'Hose Bea', prices: { EUR: 2000 } }),
      ],
    });
    await gotoSetPrice(user);
    expect(screen.getAllByRole('group', { name: /^Setpreis/ })).toHaveLength(1);
    unmount();

    setup({
      currencies: ['EUR', 'CHF', 'USD'],
      pieces: [
        buildPiece('a', {
          name: 'Jacke Cleo',
          prices: { EUR: 1000, CHF: 1100, USD: 1200 },
        }),
        buildPiece('b', {
          name: 'Hose Bea',
          prices: { EUR: 2000, CHF: 2200, USD: 2400 },
        }),
      ],
    });
    await gotoSetPrice(user);
    expect(screen.getAllByRole('group', { name: /^Setpreis/ })).toHaveLength(3);
    expect(
      screen.getByRole('group', { name: 'Setpreis USD' })
    ).toBeInTheDocument();
  });

  describe('with prices per country', () => {
    const gotoCountries = (
      user: User,
      pieceNames = ['Hemd Ida', 'Rock Lena']
    ) => gotoSetPrice(user, pieceNames);

    it('shows one row per currency and country with the master prices and sums', async () => {
      const user = userEvent.setup();
      setup({ pieces: [shirt, skirt, hat], currencies: ['EUR', 'GBP'] });
      await gotoPieces(user);
      for (const name of ['Hemd Ida', 'Rock Lena']) await addPiece(user, name);
      await next(user);
      await screen.findByRole('group', { name: 'Setpreis EUR DE' });
      const rows = screen
        .getAllByTestId(/^price-row-/)
        .map((row) => row.getAttribute('data-testid'));
      expect(rows).toEqual([
        'price-row-EUR/DE',
        'price-row-EUR/FR',
        'price-row-GBP/GB',
      ]);
      const de = within(screen.getByTestId('price-row-EUR/DE'));
      expect(de.getByText('Deutschland')).toBeInTheDocument();
      expect(de.getByText(/100,00\s€/)).toBeInTheDocument();
      expect(de.getByText(/^50,00\s€$/)).toBeInTheDocument();
      expect(de.getByText(/150,00\s€/)).toBeInTheDocument();
      const fr = within(screen.getByTestId('price-row-EUR/FR'));
      expect(fr.getByText(/105,00\s€/)).toBeInTheDocument();
      expect(fr.getByText(/160,00\s€/)).toBeInTheDocument();
      const gb = within(screen.getByTestId('price-row-GBP/GB'));
      expect(gb.getByText(/135,00\s£/)).toBeInTheDocument();
      expect(amountInput('EUR FR')).toHaveValue('160,00');
    });

    it('links the set price of a country row with its saving in percent', async () => {
      const user = userEvent.setup();
      setup({ pieces: [shirt, skirt], currencies: ['EUR', 'GBP'] });
      await gotoCountries(user);
      await typeAmount(user, 'EUR DE', '135');
      expect(percentInput('EUR DE')).toHaveValue('10');
      // the other rows are untouched
      expect(percentInput('EUR FR')).toHaveValue('');
      const percent = percentInput('GBP GB');
      await user.clear(percent);
      await user.type(percent, '20');
      await user.tab();
      expect(amountInput('GBP GB')).toHaveValue('108,00');
      expect(amountInput('EUR DE')).toHaveValue('135,00');
    });

    it('leaves out a country in which a piece has no price', async () => {
      const user = userEvent.setup();
      setup({ pieces: [shirt, skirt, hat], currencies: ['EUR', 'GBP'] });
      await gotoCountries(user, ['Hemd Ida', 'Rock Lena', 'Hut Mia']);
      expect(screen.getAllByRole('group', { name: /^Setpreis/ })).toHaveLength(
        1
      );
      expect(
        screen.getByRole('group', { name: 'Setpreis EUR DE' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('group', { name: 'Setpreis EUR FR' })
      ).not.toBeInTheDocument();
    });

    it('names the cell in an error', async () => {
      const user = userEvent.setup();
      setup({ pieces: [shirt, skirt], currencies: ['EUR', 'GBP'] });
      await gotoCountries(user);
      await typeAmount(user, 'EUR DE', '140');
      await typeAmount(user, 'GBP GB', '130');
      await typeAmount(user, 'EUR FR', '0');
      await next(user);
      expect(
        await screen.findByText('EUR/FR: Der Setpreis muss größer als 0 sein.')
      ).toBeInTheDocument();
    });
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
      'createDiscountGroup',
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

  it('creates the look group first, inactive, with the lowest rank; the discount references it and has no rank of its own', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await gotoReview(user);
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();

    expect(fake.callsTo('createDiscountGroup')).toHaveLength(1);
    const groupDraft = fake.callsTo('createDiscountGroup')[0].args[0] as Record<
      string,
      unknown
    >;
    expect(groupDraft).toMatchObject({
      key: 'look-jacket-look',
      sortOrder: '0.7',
      isActive: false,
    });
    const draft = fake.callsTo('createCartDiscount')[0].args[0] as Record<
      string,
      unknown
    >;
    expect(draft.discountGroup).toEqual({
      typeId: 'discount-group',
      key: 'look-jacket-look',
    });
    expect(draft).not.toHaveProperty('sortOrder');
    expect([...fake.groups.values()]).toEqual([
      expect.objectContaining({
        key: 'look-jacket-look',
        sortOrder: '0.7',
        isActive: false,
      }),
    ]);
    expect([...fake.discounts.values()][0].sortOrder).toBe('0.7');
  });

  it('gives a second look the next free rank, counting the rank of an existing group', async () => {
    const user = userEvent.setup();
    const { fake } = setup({
      prepare: (f) =>
        f.groups.set('grp-other', {
          id: 'grp-other',
          version: 1,
          key: 'look-other',
          sortOrder: '0.7',
          isActive: true,
        }),
    });
    await gotoReview(user);
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    const groupDraft = fake.callsTo('createDiscountGroup')[0].args[0] as Record<
      string,
      unknown
    >;
    expect(groupDraft.sortOrder).toBe('0.7001');
    expect(
      [...fake.discounts.values()].find((d) => d.key === 'look-jacket-look')
        ?.sortOrder
    ).toBe('0.7001');
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
      'createDiscountGroup',
      'createCartDiscount',
      'writeLookObject',
      'updateDiscountGroup',
      'updateCartDiscount',
    ]);
    expect([...fake.groups.values()][0].isActive).toBe(true);
    expect([...fake.discounts.values()][0].isActive).toBe(true);
    expect(screen.queryByText(/ist inaktiv und kann/)).not.toBeInTheDocument();
  });

  it('saves a look value without an image key', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await gotoPieces(user);
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
    expect(fake.objects.get('look-jacket-look')?.value).not.toHaveProperty(
      'image'
    );
  });

  it('writes one amount per currency for a project with three currencies', async () => {
    const user = userEvent.setup();
    const { fake } = setup({
      currencies: ['EUR', 'CHF', 'USD'],
      pieces: [
        buildPiece('a', {
          name: 'Jacke Cleo',
          prices: { EUR: 12999, CHF: 14290, USD: 13999 },
        }),
        buildPiece('b', {
          name: 'Hose Bea',
          prices: { EUR: 7999, CHF: 8790, USD: 8499 },
        }),
      ],
    });
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

  describe('with two countries', () => {
    async function gotoCountryReview(user: User) {
      await gotoPieces(user);
      for (const name of ['Hemd Ida', 'Rock Lena']) await addPiece(user, name);
      await next(user);
      await screen.findByRole('group', { name: 'Setpreis EUR DE' });
      await typeAmount(user, 'EUR DE', '140');
      await typeAmount(user, 'EUR FR', '150');
      await typeAmount(user, 'GBP GB', '130');
      await next(user);
      await screen.findByRole('switch', { name: 'Nach dem Anlegen aktiv' });
    }
    const setupCountries = () =>
      setup({ pieces: [shirt, skirt], currencies: ['EUR', 'GBP'] });

    it('lists one line per currency and country on the review', async () => {
      const user = userEvent.setup();
      setupCountries();
      await gotoCountryReview(user);
      expect(
        screen.getByText(
          /^EUR DE: 140,00\s€ \(Summe 150,00\s€, Ersparnis 10,00\s€\)$/
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /^EUR FR: 150,00\s€ \(Summe 160,00\s€, Ersparnis 10,00\s€\)$/
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /^GBP GB: 130,00\s£ \(Summe 135,00\s£, Ersparnis 5,00\s£\)$/
        )
      ).toBeInTheDocument();
    });

    it('writes one discount per country, then the object', async () => {
      const user = userEvent.setup();
      const { fake } = setupCountries();
      await gotoCountryReview(user);
      await user.click(screen.getByRole('button', { name: 'Look speichern' }));
      expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();

      expect(writes(fake).map((call) => call.method)).toEqual([
        'createDiscountGroup',
        'createCartDiscount',
        'createCartDiscount',
        'createCartDiscount',
        'writeLookObject',
      ]);
      const drafts = fake
        .callsTo('createCartDiscount')
        .map((call) => call.args[0] as Record<string, unknown>);
      expect(drafts.map((draft) => draft.key)).toEqual([
        'look-jacket-look',
        'look-jacket-look-FR',
        'look-jacket-look-GB',
      ]);
      expect(drafts.map((draft) => draft.cartPredicate)).toEqual([
        'country = "DE"',
        'country = "FR"',
        'country = "GB"',
      ]);
      // One group holds all country discounts: the rank is on the group.
      expect(drafts.some((draft) => 'sortOrder' in draft)).toBe(false);
      expect(drafts.map((draft) => draft.discountGroup)).toEqual(
        Array(3).fill({ typeId: 'discount-group', key: 'look-jacket-look' })
      );
      expect(fake.callsTo('createDiscountGroup')).toHaveLength(1);
      expect([...fake.groups.values()].map((g) => g.sortOrder)).toEqual([
        '0.7',
      ]);
      expect(drafts.every((draft) => draft.isActive === false)).toBe(true);
      expect(fake.objects.get('look-jacket-look')?.value.setPrice).toEqual({
        'EUR/DE': 14000,
        'EUR/FR': 15000,
        'GBP/GB': 13000,
      });
    });

    it('activates the group first, then the country discounts, and the main discount last', async () => {
      const user = userEvent.setup();
      const { fake } = setupCountries();
      await gotoCountryReview(user);
      await user.click(
        screen.getByRole('switch', { name: 'Nach dem Anlegen aktiv' })
      );
      await user.click(screen.getByRole('button', { name: 'Look speichern' }));
      expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
      const idOf = (key: string) =>
        [...fake.discounts.values()].find((d) => d.key === key)?.id;
      expect(writes(fake).map((call) => call.method)).toEqual([
        'createDiscountGroup',
        'createCartDiscount',
        'createCartDiscount',
        'createCartDiscount',
        'writeLookObject',
        'updateDiscountGroup',
        'updateCartDiscount',
        'updateCartDiscount',
        'updateCartDiscount',
      ]);
      expect([...fake.groups.values()][0].isActive).toBe(true);
      expect(fake.callsTo('updateCartDiscount').map((c) => c.args[0])).toEqual([
        idOf('look-jacket-look-FR'),
        idOf('look-jacket-look-GB'),
        idOf('look-jacket-look'),
      ]);
      expect([...fake.discounts.values()].every((d) => d.isActive)).toBe(true);
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

describe('Neuer Look: name in the project languages', () => {
  it('offers one input per project language, the data locale first, and saves only the filled ones', async () => {
    const user = userEvent.setup();
    const { fake } = setup({ languages: ['de', 'en', 'fr'] });
    await expandNameField(user);
    expect(nameInput('DE')).toBeInTheDocument();
    expect(nameInput('EN')).toBeInTheDocument();
    expect(nameInput('FR')).toBeInTheDocument();
    await fillBasics(user, { fr: 'Look veste' });
    await next(user);
    await screen.findByRole('heading', { name: 'Teile wählen (mindestens 2)' });
    for (const name of ['Jacke Cleo', 'Hose Bea']) await addPiece(user, name);
    await next(user);
    await screen.findByRole('group', { name: 'Setpreis EUR' });
    await typeAmount(user, 'EUR', '189,90');
    await typeAmount(user, 'CHF', '209,90');
    await next(user);
    await user.click(
      await screen.findByRole('button', { name: 'Look speichern' })
    );
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    const discount = [...fake.discounts.values()][0];
    expect(discount.name).toEqual({ fr: 'Look set: Look veste' });
    expect(fake.objects.has('look-look-veste')).toBe(true);
  });

  it('shows only the default language until the others are expanded', async () => {
    const user = userEvent.setup();
    setup({ languages: ['de', 'en', 'fr'] });
    await screen.findByRole('group', { name: /^Name/ });
    expect(nameInput('DE')).toBeInTheDocument();
    expect(() => nameInput('FR')).toThrow();
    await expandNameField(user);
    expect(nameInput('FR')).toBeInTheDocument();
  });

  it('works for a project with a single language', async () => {
    const user = userEvent.setup();
    setup({ languages: ['en'], locale: 'en' });
    await screen.findByRole('group', { name: /^Name/ });
    expect(nameInput('EN')).toBeInTheDocument();
    await user.type(nameInput('EN'), 'Only look');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      await screen.findByRole('heading', { name: 'Choose pieces (at least 2)' })
    ).toBeInTheDocument();
  });
});

describe('Neuer Look: description in the project languages', () => {
  const groupDraft = (fake: ReturnType<typeof createFakeLookApi>) =>
    fake.callsTo('createDiscountGroup')[0].args[0] as Record<string, unknown>;

  it('offers one multi-line input per project language, the data locale first, the others behind the toggle', async () => {
    const user = userEvent.setup();
    setup({ languages: ['de', 'en', 'fr'] });
    await screen.findByRole('group', { name: /^Beschreibung/ });
    expect(nameInput('DE', 'description')).toBeInTheDocument();
    expect(nameInput('DE', 'description').tagName).toBe('TEXTAREA');
    expect(() => nameInput('EN', 'description')).toThrow();
    expect(() => nameInput('FR', 'description')).toThrow();
    await expandNameField(user, 'description');
    expect(nameInput('EN', 'description')).toBeInTheDocument();
    expect(nameInput('FR', 'description')).toBeInTheDocument();
    // the name field is still collapsed: the toggles are independent
    expect(() => nameInput('FR')).toThrow();
    expect(
      screen.getByText(
        'Optional, in den Projektsprachen. Wird als Beschreibung der Rabattgruppe gespeichert.'
      )
    ).toBeInTheDocument();
  });

  it('is optional: step 1 goes on without it and no description is shown or saved', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await gotoReview(user);
    expect(screen.queryByText('Beschreibung')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    expect(groupDraft(fake)).not.toHaveProperty('description');
  });

  it('shows the entered description on the review step and saves it as the group description, with the name as the group name', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await fillBasics(user);
    await fillLookName(
      user,
      { de: 'Gemütlich im Herbst', en: 'Cosy in autumn' },
      'description'
    );
    await next(user);
    await screen.findByRole('heading', { name: 'Teile wählen (mindestens 2)' });
    for (const name of ['Jacke Cleo', 'Hose Bea']) await addPiece(user, name);
    await next(user);
    await screen.findByRole('group', { name: 'Setpreis EUR' });
    await typeAmount(user, 'EUR', '189,90');
    await typeAmount(user, 'CHF', '209,90');
    await next(user);
    await screen.findByRole('switch', { name: 'Nach dem Anlegen aktiv' });
    expect(screen.getByText('Beschreibung')).toBeInTheDocument();
    expect(
      screen.getByText('Gemütlich im Herbst / Cosy in autumn')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    expect(groupDraft(fake)).toMatchObject({
      key: 'look-jacket-look',
      name: [
        { locale: 'de', value: 'Jacken-Look' },
        { locale: 'en', value: 'Jacket look' },
      ],
      description: [
        { locale: 'de', value: 'Gemütlich im Herbst' },
        { locale: 'en', value: 'Cosy in autumn' },
      ],
    });
    const discount = [...fake.discounts.values()][0];
    expect(discount.name).toEqual({
      de: 'Look-Set: Jacken-Look',
      en: 'Look set: Jacket look',
    });
  });
});

describe('Neuer Look: no prices in the pieces step', () => {
  const PRICE_TEXT = /\d[.,]\d{2}|€|CHF|GBP|USD|\(DE\)|nicht verfügbar|Summe/;

  async function gotoSearch(user: User) {
    await gotoPieces(user);
    return screen.findByRole('list', { name: 'Suchergebnisse' });
  }

  it('shows no price in the search results', async () => {
    const user = userEvent.setup();
    setup({
      pieces: [
        buildPiece('glasses', {
          name: 'Classic Champagne Glasses',
          prices: { EUR: 1500, GBP: 1300 },
        }),
        trousers,
      ],
    });
    const results = await gotoSearch(user);
    const cards = within(results).getAllByRole('listitem');
    expect(cards.length).toBeGreaterThan(1);
    for (const card of cards) expect(card).not.toHaveTextContent(PRICE_TEXT);
    expect(
      within(results).getByText('Classic Champagne Glasses')
    ).toBeInTheDocument();
  });

  it('shows no price and no sum in the chosen, reorderable list', async () => {
    const user = userEvent.setup();
    setup();
    await gotoSearch(user);
    await addPiece(user, 'Jacke Cleo');
    await addPiece(user, 'Hose Bea');
    const chosen = await screen.findByRole('grid', { name: 'Gewählte Teile' });
    expect(within(chosen).getByText('Jacke Cleo')).toBeInTheDocument();
    expect(chosen).not.toHaveTextContent(PRICE_TEXT);
    expect(screen.getByTestId('pieces-chosen')).toHaveTextContent(
      /^2 Teile gewählt$/
    );
  });

  it('shows the sum of the pieces only from the set price step on', async () => {
    const user = userEvent.setup();
    setup();
    await gotoSetPrice(user);
    expect(
      await screen.findByRole('columnheader', { name: 'Summe' })
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('price-row-EUR')).getByText(/209,98\s€/)
    ).toBeInTheDocument();
  });
});

describe('Neuer Look: the look key', () => {
  const keyField = () => screen.getByRole('textbox', { name: 'Key' });

  it('suggests a key from the name and follows the name until the key is edited', async () => {
    const user = userEvent.setup();
    setup();
    await fillBasics(user, { en: 'Jacket look' });
    await waitFor(() => expect(keyField()).toHaveValue('jacket-look'));
    expect(
      screen.getByText(/Wird als look-jacket-look gespeichert/)
    ).toBeInTheDocument();
    expect(screen.getByText(/nicht mehr geändert werden/)).toBeInTheDocument();

    await fillBasics(user, { en: 'Jacket look two' });
    await waitFor(() => expect(keyField()).toHaveValue('jacket-look-two'));
  });

  it('lets the user change the key; it is saved as typed and shown on the review', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await fillBasics(user);
    await user.clear(keyField());
    await user.type(keyField(), 'Winter_2026');
    await fillBasics(user, { en: 'Renamed look' });
    expect(keyField()).toHaveValue('Winter_2026');

    await next(user);
    for (const name of ['Jacke Cleo', 'Hose Bea']) await addPiece(user, name);
    await next(user);
    await typeAmount(user, 'EUR', '189,90');
    await typeAmount(user, 'CHF', '209,90');
    await next(user);
    expect(await screen.findByText('look-Winter_2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Look speichern' }));
    expect(await screen.findByText('Look gespeichert')).toBeInTheDocument();
    expect([...fake.discounts.values()][0].key).toBe('look-Winter_2026');
    expect(fake.objects.has('look-Winter_2026')).toBe(true);
  });

  it('refuses a key with characters outside letters, digits, - and _ and writes nothing', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await fillBasics(user);
    await user.clear(keyField());
    await user.type(keyField(), 'not allowed!');
    await next(user);
    expect(
      await screen.findByText(
        'Der Key darf nur Buchstaben, Ziffern, Bindestriche und Unterstriche enthalten.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Teile wählen (mindestens 2)' })
    ).not.toBeInTheDocument();
    expect(writes(fake)).toHaveLength(0);
  });

  it('flags a key that is already taken while typing, and does not go on', async () => {
    const user = userEvent.setup();
    setup({
      prepare: (fake) => {
        fake.objects.set('look-winter', buildObject('winter', ['x', 'y']));
        fake.discounts.set(
          'd-winter',
          buildDiscount('winter', ['x', 'y'], { id: 'd-winter' })
        );
      },
    });
    await fillBasics(user);
    await user.clear(keyField());
    await user.type(keyField(), 'winter');
    expect(
      await screen.findByText('Dieser Key ist schon vergeben.')
    ).toBeInTheDocument();
    await next(user);
    expect(
      screen.queryByRole('heading', { name: 'Teile wählen (mindestens 2)' })
    ).not.toBeInTheDocument();
  });

  it('suggests a free key when the one derived from the name is taken', async () => {
    const user = userEvent.setup();
    setup({
      prepare: (fake) => {
        fake.objects.set('look-winter', buildObject('winter', ['x', 'y']));
        fake.discounts.set(
          'd-winter',
          buildDiscount('winter', ['x', 'y'], { id: 'd-winter' })
        );
      },
    });
    await fillBasics(user, { en: 'Winter' });
    await waitFor(() => expect(keyField()).toHaveValue('winter-2'));
  });

  it('takes the suggestion back with "Vorschlag übernehmen"', async () => {
    const user = userEvent.setup();
    setup();
    await fillBasics(user);
    expect(
      screen.queryByRole('button', { name: 'Vorschlag übernehmen' })
    ).not.toBeInTheDocument();
    await user.clear(keyField());
    await user.type(keyField(), 'mine');
    await user.click(
      screen.getByRole('button', { name: 'Vorschlag übernehmen' })
    );
    await waitFor(() => expect(keyField()).toHaveValue('jacket-look'));
  });

  it('goes back to the key field when it was taken by someone else while saving, and writes nothing', async () => {
    const user = userEvent.setup();
    const { fake } = setup();
    await fillBasics(user);
    await user.clear(keyField());
    await user.type(keyField(), 'race');
    await next(user);
    for (const name of ['Jacke Cleo', 'Hose Bea']) await addPiece(user, name);
    await next(user);
    await typeAmount(user, 'EUR', '189,90');
    await typeAmount(user, 'CHF', '209,90');
    await next(user);
    // another user takes the key after the form loaded the existing keys
    fake.objects.set('look-race', buildObject('race', ['x', 'y']));
    fake.discounts.set(
      'd-race',
      buildDiscount('race', ['x', 'y'], { id: 'd-race' })
    );
    await user.click(
      await screen.findByRole('button', { name: 'Look speichern' })
    );
    expect(
      await screen.findByText('Dieser Key ist schon vergeben.')
    ).toBeInTheDocument();
    expect(writes(fake)).toHaveLength(0);
  });
});

describe('Neuer Look: permissions and language', () => {
  it('disables every write control without Manage and says so', async () => {
    const user = userEvent.setup();
    setup({ canManage: false });
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Nur Lesezugriff')).toBeInTheDocument();
    expect(nameInput('DE')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(
      await screen.findByText('Bitte mindestens einen Namen eingeben.')
    ).toBeInTheDocument();
  });
});

describe('Neuer Look: the step is part of the URL', () => {
  const pathOf = (view: ReturnType<typeof setup>) =>
    view.history.location.pathname.replace(/^.*\/looks/, '/looks');

  it('shows step 1 at /new and moves to /new/pieces and back', async () => {
    const user = userEvent.setup();
    const view = setup();
    expect(pathOf(view)).toBe('/looks/new');
    await gotoPieces(user);
    expect(pathOf(view)).toBe('/looks/new/pieces');
    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(pathOf(view)).toBe('/looks/new');
    expect(
      screen.queryByRole('button', { name: 'Zurück' })
    ).not.toBeInTheDocument();
  });

  it('walks the steps with the browser back and forward buttons', async () => {
    const user = userEvent.setup();
    const view = setup();
    await gotoPieces(user);
    act(() => view.history.goBack());
    expect(pathOf(view)).toBe('/looks/new');
    expect(
      screen.queryByRole('heading', { name: 'Teile wählen (mindestens 2)' })
    ).not.toBeInTheDocument();
    act(() => view.history.goForward());
    expect(
      await screen.findByRole('heading', {
        name: 'Teile wählen (mindestens 2)',
      })
    ).toBeInTheDocument();
    expect(pathOf(view)).toBe('/looks/new/pieces');
  });

  it('uses /new/price and /new/review for the later steps', async () => {
    const user = userEvent.setup();
    const view = setup();
    await gotoSetPrice(user);
    expect(pathOf(view)).toBe('/looks/new/price');
    await typeAmount(user, 'EUR', '189,90');
    await typeAmount(user, 'CHF', '209,90');
    await next(user);
    await screen.findByRole('switch', { name: 'Nach dem Anlegen aktiv' });
    expect(pathOf(view)).toBe('/looks/new/review');
  });

  it('opens step 1 for a step address without entered data and fixes the URL', async () => {
    const view = setup({ path: '/new/review' });
    await waitFor(() => expect(pathOf(view)).toBe('/looks/new'));
    expect(
      screen.queryByRole('switch', { name: 'Nach dem Anlegen aktiv' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeInTheDocument();
  });

  it('keeps the list query in the step addresses', async () => {
    const user = userEvent.setup();
    const view = setup({ path: '/new?q=jacke' });
    await gotoPieces(user);
    expect(view.history.location.search).toBe('?q=jacke');
  });
});
