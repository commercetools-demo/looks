/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/* eslint-disable testing-library/no-node-access -- rows, piece boxes and figures are located structurally */
import userEvent from '@testing-library/user-event';
import {
  act,
  screen,
  waitFor,
  within,
} from '@commercetools-frontend/application-shell/test-utils';
import {
  APP_ROOT,
  renderLooks,
  type RenderLooksOptions,
} from '../../test-utils';
import { createFakeLookApi } from '../../test-utils/fake-look-api';
import { buildDiscount } from '../../test-utils/fixtures';
import { buildLook, buildLooks, pieces } from '../../test-utils/looks-fixtures';
import { salesOrder } from '../../test-utils/orders';

type Orders = Array<ReturnType<typeof salesOrder>>;

function setup(
  looks: Array<ReturnType<typeof buildLook>>,
  orders: Orders = [],
  options: Partial<Omit<RenderLooksOptions, 'api'>> & {
    prepare?: (fake: ReturnType<typeof createFakeLookApi>) => void;
  } = {}
) {
  const { prepare, ...renderOptions } = options;
  const fake = createFakeLookApi({
    ...buildLooks(looks),
    pieces: pieces(),
    orders,
  });
  prepare?.(fake);
  const view = renderLooks({ api: fake.api, ...renderOptions });
  return { fake, ...view };
}

const past = () => within(screen.getByTestId('past-looks'));
const cardOf = async (name: string) =>
  (await screen.findByRole('listitem', {
    name: `Früherer Look ${name}`,
  })) as HTMLElement;
const off = (key: string, name: string, ids = ['p1', 'p2'], extra = {}) =>
  buildLook(key, name, ids, { active: false, ...extra });

describe('Frühere Looks', () => {
  it('orders the cards by sets sold and marks only the best one', async () => {
    setup(
      [off('few', 'Wenig'), off('many', 'Viel'), buildLook('live', 'Läuft')],
      [
        salesOrder('o1', [{ discountId: 'disc-many', quantity: 10 }]),
        salesOrder('o2', [{ discountId: 'disc-few', quantity: 4 }]),
      ]
    );
    const many = await cardOf('Viel');
    const cards = past().getAllByRole('listitem');
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Früherer Look Viel',
      'Früherer Look Wenig',
    ]);
    expect(within(many).getByText('Bester Look')).toBeInTheDocument();
    expect(
      within(await cardOf('Wenig')).queryByText('Bester Look')
    ).not.toBeInTheDocument();
    expect(
      within(many).getByText('Verkaufte Sets').nextSibling
    ).toHaveTextContent('5');
    expect(
      within(await cardOf('Wenig')).getByText('Verkaufte Sets').nextSibling
    ).toHaveTextContent('2');
  });

  it('says "Kein Set verkauft" for a look without orders, and shows no badge if nothing sold', async () => {
    setup([off('a', 'Eins'), off('b', 'Zwei')]);
    const card = await cardOf('Eins');
    expect(within(card).getByText('Kein Set verkauft')).toBeInTheDocument();
    expect(
      within(await cardOf('Zwei')).getByText('Kein Set verkauft')
    ).toBeInTheDocument();
    expect(past().queryByText('Bester Look')).not.toBeInTheDocument();
    expect(within(card).queryByText('Verkaufte Sets')).not.toBeInTheDocument();
  });

  it('shows the period from creation to the recorded switch-off date', async () => {
    setup([
      off('dated', 'Mit Datum', ['p1', 'p2'], {
        createdAt: '2026-09-30T08:00:00.000Z',
        endedAt: '2026-10-06T12:00:00.000Z',
      }),
    ]);
    expect(
      within(await cardOf('Mit Datum')).getByText(
        'aktiv 30.09.2026 bis 06.10.2026'
      )
    ).toBeInTheDocument();
  });

  it('shows no period without a recorded end date', async () => {
    setup([off('undated', 'Ohne Datum')]);
    const card = await cardOf('Ohne Datum');
    expect(within(card).queryByText(/aktiv .* bis/)).not.toBeInTheDocument();
    expect(within(card).getByText('Ohne Datum')).toBeInTheDocument();
    expect(within(card).getByText('Kein Set verkauft')).toBeInTheDocument();
  });

  it('derives orders, sets and revenue per currency from the order lines', async () => {
    setup(
      [
        off('three', 'Dreiteiler', ['p1', 'p2', 'p3']),
        off('chf', 'Franken', ['p1', 'p2']),
      ],
      [
        salesOrder('o1', [
          { discountId: 'disc-three', quantity: 3, cents: 6000 },
        ]),
        salesOrder('o2', [
          { discountId: 'disc-three', quantity: 6, cents: 6000 },
        ]),
        salesOrder('o3', [
          { discountId: 'disc-chf', quantity: 2, currency: 'CHF', cents: 9000 },
          { discountId: 'disc-chf', quantity: 2, currency: 'CHF', cents: 9000 },
        ]),
      ]
    );
    const three = await cardOf('Dreiteiler');
    await within(three).findByText('Verkaufte Sets');
    expect(
      within(three).getByText('Verkaufte Sets').nextSibling
    ).toHaveTextContent('3');
    expect(
      within(three).getByText('Bestellungen').nextSibling
    ).toHaveTextContent('2');
    expect(within(three).getByText(/540,00\s€/)).toBeInTheDocument();
    expect(within(three).queryByText(/CHF/)).not.toBeInTheDocument();
    const chf = await cardOf('Franken');
    expect(within(chf).getByText(/360,00\sCHF/)).toBeInTheDocument();
    expect(within(chf).queryByText(/€/)).not.toBeInTheDocument();
    expect(within(chf).getByText('Bestellungen').nextSibling).toHaveTextContent(
      '1'
    );
  });

  it('shows four skeleton cards while the orders load and keeps the list usable', async () => {
    let release: () => void = () => undefined;
    const looks = [
      buildLook('live', 'Läuft'),
      ...['a', 'b', 'c', 'd', 'e'].map((key) => off(key, `Alt ${key}`)),
    ];
    const fake = createFakeLookApi({ ...buildLooks(looks), pieces: pieces() });
    const fetchOrders = fake.api.fetchRecentOrders;
    fake.api.fetchRecentOrders = async (since) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return fetchOrders(since);
    };
    renderLooks({ api: fake.api });
    expect(await screen.findByText('Läuft')).toBeInTheDocument();
    expect(await screen.findAllByTestId('past-look-skeleton')).toHaveLength(4);
    expect(screen.getByRole('switch', { name: 'Läuft aktiv' })).toBeEnabled();
    await act(async () => release());
    expect(await past().findAllByRole('listitem')).toHaveLength(5);
    expect(screen.queryAllByTestId('past-look-skeleton')).toHaveLength(0);
  });

  it('explains an empty section and reads no orders then', async () => {
    const { fake } = setup([buildLook('live', 'Läuft')]);
    expect(
      await screen.findByText('Noch keine früheren Looks')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Ausgeschaltete Looks erscheinen hier mit ihren Verkäufen.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ausgeschaltete Looks und wie sie verkauft haben')
    ).toBeInTheDocument();
    expect(fake.callsTo('fetchRecentOrders')).toHaveLength(0);
  });

  it('shows an error with retry when the sales cannot be read, while the cards keep working', async () => {
    const { fake } = setup(
      [off('a', 'Alt Eins'), buildLook('live', 'Läuft')],
      [salesOrder('o1', [{ discountId: 'disc-a', quantity: 2 }])],
      { prepare: (f) => f.failNext('fetchRecentOrders') }
    );
    expect(
      await screen.findByText(
        'Die Verkaufszahlen konnten nicht geladen werden.'
      )
    ).toBeInTheDocument();
    const card = await cardOf('Alt Eins');
    expect(within(card).queryByText('Verkaufte Sets')).not.toBeInTheDocument();
    expect(
      within(card).queryByText('Kein Set verkauft')
    ).not.toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: /wieder aktivieren/i })
    ).toBeEnabled();
    expect(screen.getByText('Läuft')).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByTestId('past-looks')).getByRole('button', {
        name: 'Erneut versuchen',
      })
    );
    expect(
      await within(await cardOf('Alt Eins')).findByText('Verkaufte Sets')
    ).toBeInTheDocument();
    expect(fake.callsTo('fetchRecentOrders')).toHaveLength(2);
  });

  it('says the figures come from the most recent orders when the read reached its bound', async () => {
    const fake = createFakeLookApi({
      ...buildLooks([off('a', 'Alt Eins')]),
      pieces: pieces(),
    });
    fake.api.fetchRecentOrders = async () => ({ orders: [], truncated: true });
    renderLooks({ api: fake.api });
    expect(
      await screen.findByText('Zahlen aus den letzten 2000 Bestellungen')
    ).toBeInTheDocument();
  });

  it('does not claim truncation for a complete read', async () => {
    setup([off('a', 'Alt Eins')]);
    await cardOf('Alt Eins');
    expect(
      screen.queryByText(/Zahlen aus den letzten/)
    ).not.toBeInTheDocument();
  });

  it('lays the cards out in equal columns with a 92 px piece strip', async () => {
    setup([off('a', 'Alt Eins'), off('b', 'Alt Zwei')]);
    const card = await cardOf('Alt Eins');
    const grid = screen.getByRole('list', { name: 'Frühere Looks' });
    expect(getComputedStyle(grid).gridTemplateColumns).toContain(
      'minmax(0, 1fr)'
    );
    expect(within(card).getByTestId('past-look-strip')).toHaveStyle({
      height: '92px',
    });
  });

  it('shows at most three piece images in the card', async () => {
    setup([off('plain', 'Ohne Foto', ['p1', 'p2', 'p3', 'p4'])]);
    expect((await cardOf('Ohne Foto')).querySelectorAll('img')).toHaveLength(3);
  });

  it('opens the detail from the card, but not from "Wieder aktivieren"', async () => {
    const { history } = setup([off('open', 'Zum Öffnen')]);
    await userEvent.click(
      within(await cardOf('Zum Öffnen')).getByText('Zum Öffnen')
    );
    expect(history.location.pathname).toBe(`${APP_ROOT}/open`);
  });
});

describe('Frühere Looks: reactivation', () => {
  it('switches the look on, clears the end date and moves it to the main list', async () => {
    const { fake } = setup([
      off('back', 'Zurück', ['p1', 'p2'], {
        endedAt: '2026-10-06T12:00:00.000Z',
      }),
    ]);
    const card = await cardOf('Zurück');
    await userEvent.click(
      within(card).getByRole('button', { name: /wieder aktivieren/i })
    );
    expect(
      (await screen.findAllByText('Zurück ist aktiv')).length
    ).toBeGreaterThan(0);
    expect(fake.discounts.get('disc-back')?.isActive).toBe(true);
    expect(fake.objects.get('look-back')?.value.endedAt).toBeUndefined();
    const grid = screen.getByRole('grid');
    expect(within(grid).getByText('Zurück')).toBeInTheDocument();
    await waitFor(() =>
      expect(past().queryByRole('listitem')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Noch keine früheren Looks')).toBeInTheDocument();
    expect(screen.getByTestId('looks-count')).toHaveTextContent('1 Look');
  });

  it('switches the country discounts on too, country discounts first and the main one last', async () => {
    const back = off('back', 'Zurück', ['p1', 'p2'], {
      endedAt: '2026-10-06T12:00:00.000Z',
    });
    back.discounts.push(
      buildDiscount('back-DE', ['p1', 'p2'], {
        country: 'DE',
        isActive: false,
        name: { de: 'Look-Set: Zurück', en: 'Look set: Zurück' },
        description: { de: 'Zurück', en: 'Zurück' },
      })
    );
    const { fake } = setup([back]);
    await userEvent.click(
      within(await cardOf('Zurück')).getByRole('button', {
        name: /wieder aktivieren/i,
      })
    );
    expect(
      (await screen.findAllByText('Zurück ist aktiv')).length
    ).toBeGreaterThan(0);
    expect(fake.discounts.get('disc-back-DE')?.isActive).toBe(true);
    expect(fake.discounts.get('disc-back')?.isActive).toBe(true);
    expect(
      fake.callsTo('updateCartDiscount').map((call) => call.args[0])
    ).toEqual(['disc-back-DE', 'disc-back']);
  });

  it('switches the look group on first, then the discounts', async () => {
    const { fake } = setup(
      [
        off('back', 'Zurück', ['p1', 'p2'], {
          endedAt: '2026-10-06T12:00:00.000Z',
        }),
      ],
      [],
      {
        prepare: (f) =>
          f.groups.set('grp-back', {
            id: 'grp-back',
            version: 1,
            key: 'look-back',
            sortOrder: '0.7',
            isActive: false,
          }),
      }
    );
    await userEvent.click(
      within(await cardOf('Zurück')).getByRole('button', {
        name: /wieder aktivieren/i,
      })
    );
    expect(
      (await screen.findAllByText('Zurück ist aktiv')).length
    ).toBeGreaterThan(0);
    expect(fake.groups.get('grp-back')?.isActive).toBe(true);
    expect(fake.discounts.get('disc-back')?.isActive).toBe(true);
    expect(
      fake.calls
        .filter((call) =>
          ['updateDiscountGroup', 'updateCartDiscount'].includes(call.method)
        )
        .map((call) => call.method)
    ).toEqual(['updateDiscountGroup', 'updateCartDiscount']);
  });

  it('reactivates a legacy look without a group', async () => {
    const { fake } = setup([off('old', 'Alt', ['p1', 'p2'])]);
    await userEvent.click(
      within(await cardOf('Alt')).getByRole('button', {
        name: /wieder aktivieren/i,
      })
    );
    await screen.findAllByText('Alt ist aktiv');
    expect(fake.discounts.get('disc-old')?.isActive).toBe(true);
    expect(fake.callsTo('updateDiscountGroup')).toHaveLength(0);
  });

  it('does not open the detail when "Wieder aktivieren" is pressed', async () => {
    const { history } = setup([off('stay', 'Bleibt')]);
    await userEvent.click(
      within(await cardOf('Bleibt')).getByRole('button', {
        name: /wieder aktivieren/i,
      })
    );
    await screen.findAllByText('Bleibt ist aktiv');
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(history.location.pathname).toBe(APP_ROOT);
  });
});

describe('Frühere Looks: view only', () => {
  it('shows "Wieder aktivieren" disabled, not hidden', async () => {
    setup([off('ro', 'Nur Lesen')], [], { canManage: false });
    const card = await cardOf('Nur Lesen');
    expect(
      within(card).getByRole('button', { name: /wieder aktivieren/i })
    ).toBeDisabled();
    expect(screen.getByText('Nur Lesezugriff')).toBeInTheDocument();
  });
});
