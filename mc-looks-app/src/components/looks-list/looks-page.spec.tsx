/* eslint-disable testing-library/no-node-access -- rows, photo boxes and figures are located structurally */
import userEvent from '@testing-library/user-event';
import {
  act,
  screen,
  waitFor,
  within,
} from '@commercetools-frontend/application-shell/test-utils';
import { config } from '../../config';
import {
  APP_ROOT,
  renderLooks,
  type RenderLooksOptions,
} from '../../test-utils';
import { createFakeLookApi } from '../../test-utils/fake-look-api';
import { buildDiscount } from '../../test-utils/fixtures';
import {
  buildLook,
  buildLooks,
  PIECE_IDS,
  pieces,
} from '../../test-utils/looks-fixtures';
import { LOOK_TABLE_COLUMN_WIDTHS } from './looks-table';

const NAMES = [
  'Büro',
  'Freizeit',
  'Abend',
  'Reise',
  'Sport',
  'Strand',
  'Winter',
  'Sommer',
];

const eightActive = () =>
  buildLooks(
    NAMES.map((name, i) =>
      buildLook(`look-${i}`, name, ['p1', 'p2'], {
        setPrice: { EUR: 18000 - i * 100, CHF: 19800 - i * 100 },
      })
    )
  );

function setup(
  data: ReturnType<typeof buildLooks> = eightActive(),
  options: Partial<Omit<RenderLooksOptions, 'api'>> & {
    prepare?: (fake: ReturnType<typeof createFakeLookApi>) => void;
  } = {}
) {
  const { prepare, ...renderOptions } = options;
  const fake = createFakeLookApi({ ...data, pieces: pieces() });
  prepare?.(fake);
  const view = renderLooks({ api: fake.api, ...renderOptions });
  return { fake, ...view };
}

const rowOf = async (name: string) =>
  (await screen.findByText(name)).closest('[role="row"]') as HTMLElement;

const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => NAMES.find((name) => within(row).queryByText(name)))
    .filter(Boolean);

describe('looks list', () => {
  it('lists all active looks with set price, sum, saving and status, and the total count', async () => {
    setup();
    expect(
      await screen.findByRole('heading', { name: 'Looks', level: 1 })
    ).toBeInTheDocument();
    const row = await rowOf('Büro');
    expect(within(row).getByText('look-0')).toBeInTheDocument();
    expect(within(row).getByText(/180,00\s€/)).toBeInTheDocument();
    expect(within(row).getByText(/198,00\sCHF/)).toBeInTheDocument();
    expect(within(row).getByText(/200,00\s€/)).toBeInTheDocument();
    expect(await within(row).findByText('10 %')).toBeInTheDocument();
    expect(
      within(row).getByText('Aktiv', { selector: 'span' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('looks-count')).toHaveTextContent('8 Looks');
    expect(screen.getAllByRole('row')).toHaveLength(9);
    expect(
      screen.getAllByRole('columnheader').map((h) => h.textContent)
    ).toEqual(
      expect.arrayContaining([
        'Look',
        'Teile',
        'Setpreis',
        'Summe',
        'Ersparnis',
        'Status',
        'Aktiv',
      ])
    );
  });

  it('shows the look photo in the Look column, else the first piece images in the same box', async () => {
    const shopOrigin = jest.replaceProperty(
      config,
      'shopOrigin',
      'https://shop.example.com'
    );
    try {
      setup(
        buildLooks([
          buildLook('with-photo', 'Mit Foto', ['p1', 'p2'], {
            image: { path: 'looks/with-photo.webp', width: 800, height: 1200 },
          }),
          buildLook('no-photo', 'Ohne Foto', ['p1', 'p2', 'p3']),
        ])
      );
      const withPhoto = await rowOf('Mit Foto');
      const photo = within(withPhoto).getByAltText('Mit Foto');
      expect(photo).toHaveAttribute(
        'src',
        'https://shop.example.com/looks/with-photo.webp'
      );
      expect(photo.closest('[data-look-photo]')).toHaveStyle({
        aspectRatio: '2 / 3',
      });
      const withoutPhoto = await rowOf('Ohne Foto');
      expect(withoutPhoto.querySelector('[data-look-photo]')).toBeNull();
      const box = withoutPhoto.querySelector(
        '[data-photo-fallback]'
      ) as HTMLElement;
      expect(box).toHaveStyle({ aspectRatio: '2 / 3' });
      expect(box.querySelectorAll('img')).toHaveLength(2);
    } finally {
      shopOrigin.restore();
    }
  });

  it('shows all five piece images of a look', async () => {
    setup(
      buildLooks([
        buildLook('five', 'Fünf Teile', ['p1', 'p2', 'p3', 'p4', 'p5']),
      ])
    );
    const row = await rowOf('Fünf Teile');
    const strip = row.querySelector(
      '[data-custom-composition="piece-strip"]'
    ) as HTMLElement;
    expect(strip.querySelectorAll('img')).toHaveLength(5);
    expect(strip).toHaveAccessibleName(/Teile: Piece p1, Piece p2/);
  });

  it('shows at most five piece images and counts the further pieces as +N', async () => {
    setup(
      buildLooks([
        buildLook('seven', 'Sieben Teile', PIECE_IDS, {
          setPrice: { EUR: 60000, CHF: 66000 },
        }),
      ])
    );
    const row = await rowOf('Sieben Teile');
    const strip = row.querySelector(
      '[data-custom-composition="piece-strip"]'
    ) as HTMLElement;
    expect(strip.querySelectorAll('img')).toHaveLength(5);
    expect(within(strip).getByText('+2')).toBeInTheDocument();
    expect(strip).toHaveAccessibleName(/Piece p6, Piece p7/);
  });

  it('shows no +N for a look with exactly five pieces', async () => {
    setup(buildLooks([buildLook('five', 'Fünf Teile', PIECE_IDS.slice(0, 5))]));
    const row = await rowOf('Fünf Teile');
    expect(within(row).queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it('filters by name, updates the count and says so when nothing matches', async () => {
    setup();
    await rowOf('Büro');
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Looks durchsuchen' }),
      'frei'
    );
    expect(await screen.findByText('Freizeit')).toBeInTheDocument();
    expect(screen.queryByText('Büro')).not.toBeInTheDocument();
    expect(screen.getByTestId('looks-count')).toHaveTextContent('1 Look');
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Looks durchsuchen' }),
      'xyz'
    );
    expect(
      await screen.findByText('Kein Look passt zu Ihrer Suche.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('sorts by the default (name ascending) and by the sortable columns, announcing the state', async () => {
    const { history } = setup();
    await rowOf('Büro');
    expect(names()).toEqual([
      'Abend',
      'Büro',
      'Freizeit',
      'Reise',
      'Sommer',
      'Sport',
      'Strand',
      'Winter',
    ]);
    expect(screen.getByRole('columnheader', { name: /^Look/ })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    expect(screen.getByRole('status', { name: '' })).toBeDefined();

    await userEvent.click(
      screen.getByRole('columnheader', { name: /Setpreis/ })
    );
    expect(names()[0]).toBe('Sommer');
    expect(
      screen.getByRole('columnheader', { name: /Setpreis/ })
    ).toHaveAttribute('aria-sort', 'ascending');
    expect(
      screen.getByText('Sortiert nach Setpreis, aufsteigend')
    ).toBeInTheDocument();
    expect(history.location.search).toBe('?sort=setPrice');

    await userEvent.click(
      screen.getByRole('columnheader', { name: /Setpreis/ })
    );
    expect(names()[0]).toBe('Büro');
    expect(
      screen.getByText('Sortiert nach Setpreis, absteigend')
    ).toBeInTheDocument();
    expect(history.location.search).toBe('?sort=setPrice&dir=desc');
  });

  it('does not offer sorting for Teile and Aktiv', async () => {
    setup();
    await rowOf('Büro');
    expect(
      screen.getByRole('columnheader', { name: 'Teile' })
    ).not.toHaveAttribute('aria-sort');
    expect(
      screen.getByRole('columnheader', { name: 'Aktiv' })
    ).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('columnheader', { name: /Summe/ })).toHaveAttribute(
      'aria-sort',
      'none'
    );
  });

  it('sorts by the live sum over all looks, not just the visible page', async () => {
    const data = buildLooks([
      ...Array.from({ length: 21 }, (_, i) =>
        buildLook(`two-${i}`, `Alpha ${String(i).padStart(2, '0')}`, [
          'p1',
          'p2',
        ])
      ),
      buildLook('three', 'Zeta Drei Teile', ['p1', 'p2', 'p3'], {
        setPrice: { EUR: 28000, CHF: 31000 },
      }),
    ]);
    setup(data, { path: '?sort=sum&dir=desc' });
    expect(await screen.findByText('Zeta Drei Teile')).toBeInTheDocument();
  });

  it('keeps every fixed column wider than its header in German and English', async () => {
    setup();
    await rowOf('Büro');
    const widths = LOOK_TABLE_COLUMN_WIDTHS;
    // Headers by column in both languages; 8 px per character, 24 px cell
    // padding and 16 px for the sort icon bound the header width from above.
    const headers: Record<string, { texts: string[]; sortable: boolean }> = {
      setPrice: { texts: ['Setpreis', 'Set price'], sortable: true },
      sum: { texts: ['Summe', 'Total'], sortable: true },
      saving: { texts: ['Ersparnis', 'Saving'], sortable: true },
      status: { texts: ['Status'], sortable: true },
      active: { texts: ['Aktiv', 'Active'], sortable: false },
    };
    for (const [column, { texts, sortable }] of Object.entries(headers)) {
      const longest = Math.max(...texts.map((text) => text.length));
      expect(widths[column as keyof typeof widths]).toBeGreaterThanOrEqual(
        longest * 8 + 24 + (sortable ? 16 : 0)
      );
    }
    expect(widths.pieces).toBeGreaterThanOrEqual(5 * 36 + 4 * 4);
    expect(widths.lookMin).toBe(200);
  });

  it('shows a loading state while the looks are read', async () => {
    setup();
    expect(
      screen.getByRole('status', { name: 'Wird geladen' })
    ).toBeInTheDocument();
    await rowOf('Büro');
  });

  it('shows an error with retry and no partial list when the read fails', async () => {
    setup(undefined, {
      prepare: (fake) => fake.failNext('fetchCartDiscounts'),
    });
    expect(
      await screen.findByText('Die Looks konnten nicht geladen werden')
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('looks-count')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Erneut versuchen' })
    );
    expect(await screen.findByText('Büro')).toBeInTheDocument();
    expect(
      screen.queryByText('Die Looks konnten nicht geladen werden')
    ).not.toBeInTheDocument();
  });

  it('explains an empty project and offers "Neuer Look"', async () => {
    const { history } = setup({ objects: [], discounts: [] });
    expect(await screen.findByText('Noch keine Looks')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Neuer Look' });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[1]);
    expect(history.location.pathname).toBe(`${APP_ROOT}/new`);
  });

  it('puts "Neuer Look" at the right of the heading and opens the creation route', async () => {
    const { history } = setup();
    await rowOf('Büro');
    await userEvent.click(screen.getByRole('button', { name: 'Neuer Look' }));
    expect(history.location.pathname).toBe(`${APP_ROOT}/new`);
  });
});

describe('looks list: which looks are listed', () => {
  it('lists active and incomplete looks, and complete inactive ones only under Frühere Looks', async () => {
    const data = buildLooks([
      buildLook('on', 'Aktiver Look'),
      buildLook('off', 'Ausgeschalteter Look', ['p1', 'p2'], { active: false }),
      buildLook('broken', 'Halber Look', ['p1', 'p2'], {
        active: false,
        withoutObject: true,
      }),
    ]);
    setup(data);
    const table = await screen.findByRole('grid');
    expect(within(table).getByText('Aktiver Look')).toBeInTheDocument();
    expect(within(table).getByText('Halber Look')).toBeInTheDocument();
    expect(
      within(table).queryByText('Ausgeschalteter Look')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('looks-count')).toHaveTextContent('2 Looks');
    const past = screen.getByTestId('past-looks');
    expect(
      await within(past).findByText('Ausgeschalteter Look')
    ).toBeInTheDocument();
  });

  it('says so when no look is active', async () => {
    setup(
      buildLooks([buildLook('off', 'Aus', ['p1', 'p2'], { active: false })])
    );
    expect(
      await screen.findByText('Zurzeit ist kein Look aktiv.')
    ).toBeInTheDocument();
    expect(await screen.findByText('Frühere Looks')).toBeInTheDocument();
  });
});

describe('looks list: paging and URL state', () => {
  const many = () =>
    buildLooks(
      Array.from({ length: 25 }, (_, i) =>
        buildLook(`k${i}`, `Look ${String(i).padStart(2, '0')}`)
      )
    );

  it('shows one page of 20 with the total count and page controls', async () => {
    setup(many());
    await screen.findByText('Look 00');
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByTestId('looks-count')).toHaveTextContent('25 Looks');
    expect(
      screen.getByRole('navigation', { name: 'Seiten der Looks' })
    ).toBeInTheDocument();
  });

  it('keeps page and size in the URL and restores them on load', async () => {
    const { history } = setup(many());
    await screen.findByText('Look 00');
    await userEvent.click(
      screen.getByRole('button', { name: /next|nächste/i })
    );
    expect(await screen.findByText('Look 20')).toBeInTheDocument();
    expect(screen.queryByText('Look 00')).not.toBeInTheDocument();
    expect(history.location.search).toBe('?page=2');
    expect(screen.getByTestId('looks-count')).toHaveTextContent('25 Looks');
  });

  it('restores page, size, sort and search from the URL', async () => {
    setup(many(), { path: '?page=2&size=20&sort=name&dir=desc&q=look' });
    expect(await screen.findByText('Look 04')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(
      screen.getByRole('searchbox', { name: 'Looks durchsuchen' })
    ).toHaveValue('look');
  });

  it('returns to page 1 when search or sort change', async () => {
    const { history } = setup(many(), { path: '?page=2' });
    await screen.findByText('Look 20');
    await userEvent.click(
      screen.getByRole('columnheader', { name: /Setpreis/ })
    );
    expect(history.location.search).toBe('?sort=setPrice');
    await screen.findAllByRole('row');
  });
});

describe('looks list: switching and opening', () => {
  it('opens the detail on a row click', async () => {
    const { history } = setup(buildLooks([buildLook('city', 'Stadt')]));
    await userEvent.click(within(await rowOf('Stadt')).getByText('Stadt'));
    // The table acts on a row press after a short delay (double-click guard).
    await waitFor(() =>
      expect(history.location.pathname).toBe(`${APP_ROOT}/city`)
    );
  });

  it('does not open the detail when the switch is used', async () => {
    const { history } = setup(
      buildLooks([buildLook('office', 'Büro'), buildLook('city', 'Stadt')])
    );
    await userEvent.click(within(await rowOf('Büro')).getByRole('switch'));
    await screen.findAllByText('Büro ist ausgeschaltet');
    await act(() => new Promise((resolve) => setTimeout(resolve, 450)));
    expect(history.location.pathname).toBe(APP_ROOT);
  });

  it('switches a look off: toast, end date recorded, the row moves to Frühere Looks', async () => {
    const { fake } = setup(
      buildLooks([buildLook('office', 'Büro'), buildLook('city', 'Stadt')])
    );
    const row = await rowOf('Büro');
    await userEvent.click(
      within(row).getByRole('switch', { name: 'Büro aktiv' })
    );
    expect(
      (await screen.findAllByText('Büro ist ausgeschaltet')).length
    ).toBeGreaterThan(0);
    const grid = screen.getByRole('grid');
    expect(within(grid).queryByText('Büro')).not.toBeInTheDocument();
    expect(screen.getByTestId('looks-count')).toHaveTextContent('1 Look');
    expect(
      await within(screen.getByTestId('past-looks')).findByText('Büro')
    ).toBeInTheDocument();
    expect(fake.discounts.get('disc-office')?.isActive).toBe(false);
    expect(fake.objects.get('look-office')?.value.endedAt).toEqual(
      expect.any(String)
    );
  });

  it('switches the country discounts of a look too', async () => {
    const office = buildLook('office', 'Büro');
    const data = buildLooks([office]);
    data.discounts.push(
      buildDiscount('office-FR', ['p1', 'p2'], {
        country: 'FR',
        name: { de: 'Look-Set: Büro', en: 'Look set: Büro' },
        description: { de: 'Büro', en: 'Büro' },
      })
    );
    const { fake } = setup(data);
    await userEvent.click(
      within(await rowOf('Büro')).getByRole('switch', { name: 'Büro aktiv' })
    );
    await waitFor(() =>
      expect(fake.discounts.get('disc-office-FR')?.isActive).toBe(false)
    );
    expect(fake.discounts.get('disc-office')?.isActive).toBe(false);
    expect(
      fake.callsTo('updateCartDiscount').map((call) => call.args[0])
    ).toEqual(['disc-office', 'disc-office-FR']);
  });

  it('switches the look group first, then the discounts', async () => {
    const { fake } = setup(undefined, {
      prepare: (f) =>
        f.groups.set('grp-look-0', {
          id: 'grp-look-0',
          version: 1,
          key: 'look-look-0',
          sortOrder: '0.7',
          isActive: true,
        }),
    });
    await userEvent.click(
      within(await rowOf('Büro')).getByRole('switch', { name: 'Büro aktiv' })
    );
    await waitFor(() =>
      expect(fake.groups.get('grp-look-0')?.isActive).toBe(false)
    );
    await waitFor(() =>
      expect(fake.discounts.get('disc-look-0')?.isActive).toBe(false)
    );
    const order = fake.calls
      .filter((call) =>
        ['updateDiscountGroup', 'updateCartDiscount'].includes(call.method)
      )
      .map((call) => call.method);
    expect(order[0]).toBe('updateDiscountGroup');
    expect(order).toContain('updateCartDiscount');
    expect(fake.callsTo('getDiscountGroupByKey')[0].args).toEqual([
      'look-look-0',
    ]);
  });

  it('still switches a legacy look without a group and makes no group call', async () => {
    const { fake } = setup();
    await userEvent.click(
      within(await rowOf('Büro')).getByRole('switch', { name: 'Büro aktiv' })
    );
    await waitFor(() =>
      expect(fake.discounts.get('disc-look-0')?.isActive).toBe(false)
    );
    expect(fake.callsTo('updateDiscountGroup')).toHaveLength(0);
    expect(fake.groups.size).toBe(0);
  });

  it('offers no switch for an incomplete look, only "Vervollständigen", which opens the detail', async () => {
    const { history } = setup(
      buildLooks([
        buildLook('half', 'Halber Look', ['p1', 'p2'], { withoutObject: true }),
      ])
    );
    const row = await rowOf('Halber Look');
    expect(within(row).queryByRole('switch')).not.toBeInTheDocument();
    expect(within(row).getByText('Unvollständig')).toBeInTheDocument();
    await userEvent.click(
      within(row).getByRole('button', { name: /vervollständigen/i })
    );
    await waitFor(() =>
      expect(history.location.pathname).toBe(`${APP_ROOT}/half`)
    );
  });

  it('shows the current state and says so when the discount changed in the meantime', async () => {
    const { fake } = setup(buildLooks([buildLook('office', 'Büro')]));
    const row = await rowOf('Büro');
    // Someone else switched it off and the app's copy is stale.
    fake.discounts.set('disc-office', {
      ...fake.discounts.get('disc-office')!,
      version: 7,
      isActive: false,
    });
    await userEvent.click(
      within(row).getByRole('switch', { name: 'Büro aktiv' })
    );
    expect(
      await screen.findByText(
        'Der Rabatt wurde inzwischen geändert. Angezeigt wird jetzt sein aktueller Stand.'
      )
    ).toBeInTheDocument();
    expect(fake.callsTo('updateCartDiscount')).toHaveLength(1);
    expect(fake.discounts.get('disc-office')?.isActive).toBe(false);
  });

  it('keeps the switch standing when the end-date write fails', async () => {
    const { fake } = setup(buildLooks([buildLook('office', 'Büro')]), {
      prepare: (f) => f.failNext('writeLookObject'),
    });
    const row = await rowOf('Büro');
    await userEvent.click(
      within(row).getByRole('switch', { name: 'Büro aktiv' })
    );
    expect(
      (await screen.findAllByText('Büro ist ausgeschaltet')).length
    ).toBeGreaterThan(0);
    expect(fake.discounts.get('disc-office')?.isActive).toBe(false);
  });

  it('shows loading placeholders in the price columns while the pieces load', async () => {
    let release: () => void = () => undefined;
    const fake = createFakeLookApi({
      ...buildLooks([buildLook('office', 'Büro')]),
      pieces: pieces(),
    });
    const fetchPieces = fake.api.fetchPieces;
    fake.api.fetchPieces = async (ids) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return fetchPieces(ids);
    };
    renderLooks({ api: fake.api });
    const row = await rowOf('Büro');
    expect(
      within(row).getAllByLabelText('Preise werden geladen').length
    ).toBeGreaterThan(0);
    release();
    expect(await within(row).findByText('10 %')).toBeInTheDocument();
    expect(
      within(row).queryByLabelText('Preise werden geladen')
    ).not.toBeInTheDocument();
  });
});

describe('looks list: view only', () => {
  it('shows every write control disabled, not hidden, with the read-only indication', async () => {
    setup(
      buildLooks([
        buildLook('office', 'Büro'),
        buildLook('half', 'Halber Look', ['p1', 'p2'], { withoutObject: true }),
        buildLook('off', 'Aus', ['p1', 'p2'], { active: false }),
      ]),
      { canManage: false }
    );
    const row = await rowOf('Büro');
    expect(screen.getByText('Nur Lesezugriff')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Neuer Look' })).toBeDisabled();
    expect(
      within(row).getByRole('switch', { name: 'Büro aktiv' })
    ).toBeDisabled();
    expect(
      within(await rowOf('Halber Look')).getByRole('button', {
        name: /vervollständigen/i,
      })
    ).toBeDisabled();
    expect(
      await screen.findByRole('button', { name: /wieder aktivieren/i })
    ).toBeDisabled();
    expect(
      screen.getByRole('columnheader', { name: 'Aktiv' })
    ).toBeInTheDocument();
  });

  it('does not show the read-only indication to users who may manage', async () => {
    setup();
    await rowOf('Büro');
    expect(screen.queryByText('Nur Lesezugriff')).not.toBeInTheDocument();
  });
});
