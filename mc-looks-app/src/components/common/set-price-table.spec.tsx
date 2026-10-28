import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import {
  screen,
  within,
} from '@commercetools-frontend/application-shell/test-utils';
import type { Piece } from '../../domain/types';
import { renderUi } from '../../test-utils/render-ui';
import { buildPiece } from '../../test-utils/fixtures';
import { SetPriceTable, type PriceMode } from './set-price-table';

const shirt = buildPiece('shirt', {
  name: 'Hemd Ida',
  prices: { 'EUR/DE': 10000, 'EUR/FR': 10500, 'GBP/GB': 9000 },
});
const skirt = buildPiece('skirt', {
  name: 'Rock Lena',
  prices: { 'EUR/DE': 5000, 'EUR/FR': 5500, 'GBP/GB': 4500 },
});
const hat = buildPiece('hat', { name: 'Hut Mia', prices: { 'EUR/DE': 2000 } });

let lastTexts: Record<string, string> = {};
let lastModes: Record<string, PriceMode> = {};

function Host(props: {
  pieces: Piece[];
  errors?: Record<string, string | undefined>;
  isDisabled?: boolean;
  initialTexts?: Record<string, string>;
  initialModes?: Record<string, PriceMode>;
}) {
  const [state, setState] = useState<{
    texts: Record<string, string>;
    modes: Record<string, PriceMode>;
  }>({ texts: props.initialTexts ?? {}, modes: props.initialModes ?? {} });
  lastTexts = state.texts;
  lastModes = state.modes;
  return (
    <SetPriceTable
      pieces={props.pieces}
      texts={state.texts}
      modes={state.modes}
      onChange={setState}
      errors={props.errors ?? {}}
      isDisabled={props.isDisabled ?? false}
    />
  );
}

const amount = (label: string) =>
  within(screen.getByRole('group', { name: `Setpreis ${label}` })).getByRole(
    'textbox'
  );
const percent = (label: string) =>
  screen.getByRole('textbox', {
    name: new RegExp(`^Ersparnis in Prozent ${label}`),
  });
const rowIds = () =>
  screen
    .getAllByTestId(/^price-row-/)
    .map((row) => row.getAttribute('data-testid'));

const renderTable = (ui: Parameters<typeof renderUi>[0]) =>
  renderUi(ui, { currencies: ['EUR', 'GBP'] });

describe('SetPriceTable', () => {
  it('shows one row per currency and country, in currency then country order', async () => {
    renderTable(<Host pieces={[shirt, skirt]} />);
    await screen.findByTestId('price-row-EUR/DE');
    expect(rowIds()).toEqual([
      'price-row-EUR/DE',
      'price-row-EUR/FR',
      'price-row-GBP/GB',
    ]);
    for (const header of [
      'Währung',
      'Land',
      'Hemd Ida',
      'Rock Lena',
      'Summe',
      'Setpreis',
      'Ersparnis %',
      'Rabatt',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: header })
      ).toBeInTheDocument();
    }
    const gb = within(screen.getByTestId('price-row-GBP/GB'));
    expect(gb.getByText(/^90,00\s£$/)).toBeInTheDocument();
    expect(gb.getByText(/^45,00\s£$/)).toBeInTheDocument();
    expect(gb.getByText(/^135,00\s£$/)).toBeInTheDocument();
  });

  it('shows country-less prices as "ohne Land" with the plain label', async () => {
    renderTable(
      <Host
        pieces={[
          buildPiece('a', { name: 'A', prices: { EUR: 1000 } }),
          buildPiece('b', { name: 'B', prices: { EUR: 2000 } }),
        ]}
      />
    );
    const row = within(await screen.findByTestId('price-row-EUR'));
    expect(row.getByText('ohne Land')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Setpreis EUR' })
    ).toBeInTheDocument();
    expect(percent('EUR')).toBeInTheDocument();
  });

  it('starts every row at its sum', async () => {
    renderTable(<Host pieces={[shirt, skirt]} />);
    await screen.findByTestId('price-row-EUR/DE');
    expect(amount('EUR DE')).toHaveValue('150,00');
    expect(amount('EUR FR')).toHaveValue('160,00');
    expect(amount('GBP GB')).toHaveValue('135,00');
    expect(lastTexts).toEqual({
      'EUR/DE': '150.00',
      'EUR/FR': '160.00',
      'GBP/GB': '135.00',
    });
  });

  it('has one column per piece, however many there are', async () => {
    const seven = Array.from({ length: 7 }, (_, i) =>
      buildPiece(`m${i}`, {
        name: `Teil ${i}`,
        prices: { 'EUR/DE': 1000, 'EUR/FR': 1000, 'GBP/GB': 1000 },
      })
    );
    renderTable(<Host pieces={seven} />);
    await screen.findByTestId('price-row-EUR/DE');
    for (let i = 0; i < 7; i += 1) {
      expect(
        screen.getByRole('columnheader', { name: `Teil ${i}` })
      ).toBeInTheDocument();
    }
  });

  it('omits a row in which a piece has no price', async () => {
    renderTable(<Host pieces={[shirt, skirt, hat]} />);
    await screen.findByTestId('price-row-EUR/DE');
    expect(rowIds()).toEqual(['price-row-EUR/DE']);
  });

  it('shows the saving for a typed set price and writes the set price for a typed saving', async () => {
    const user = userEvent.setup();
    renderTable(<Host pieces={[shirt, skirt]} />);
    await screen.findByTestId('price-row-EUR/DE');
    expect(percent('EUR DE')).toHaveValue('');

    await user.clear(amount('EUR DE'));
    await user.type(amount('EUR DE'), '135');
    // the money input commits when it is left
    await user.tab();
    expect(percent('EUR DE')).toHaveValue('10');
    // other rows are not touched
    expect(percent('EUR FR')).toHaveValue('');

    await user.clear(percent('GBP GB'));
    await user.type(percent('GBP GB'), '20');
    await user.tab();
    expect(amount('GBP GB')).toHaveValue('108,00');
    expect(lastTexts['GBP/GB']).toBe('108.00');
  });

  it('shows an error under its row', async () => {
    renderTable(
      <Host
        pieces={[shirt, skirt]}
        errors={{ 'EUR/FR': 'EUR/FR: Der Setpreis muss größer als 0 sein.' }}
      />
    );
    const row = within(await screen.findByTestId('price-row-EUR/FR'));
    expect(row.getByRole('alert')).toHaveTextContent(
      'EUR/FR: Der Setpreis muss größer als 0 sein.'
    );
    expect(
      within(screen.getByTestId('price-row-EUR/DE')).queryByRole('alert')
    ).not.toBeInTheDocument();
  });

  it('disables every input when the table is disabled', async () => {
    renderTable(<Host pieces={[shirt, skirt]} isDisabled />);
    await screen.findByTestId('price-row-EUR/DE');
    expect(amount('EUR DE')).toBeDisabled();
    expect(percent('EUR DE')).toBeDisabled();
  });

  const global = () =>
    screen.getByRole('textbox', { name: 'Prozent für alle Zeilen' });
  const kind = (key: string) =>
    within(screen.getByTestId(`price-row-${key}`))
      .getAllByRole('cell')
      .at(-1);

  it('starts every row in price mode with the discount "Betrag"', async () => {
    renderTable(<Host pieces={[shirt, skirt]} />);
    await screen.findByTestId('price-row-EUR/DE');
    for (const key of ['EUR/DE', 'EUR/FR', 'GBP/GB']) {
      expect(kind(key)).toHaveTextContent('Betrag');
    }
  });

  describe('shared percentage', () => {
    const empty = { 'EUR/FR': '', 'GBP/GB': '' };
    const emptyModes = { 'EUR/FR': 'price', 'GBP/GB': 'price' } as const;

    it('shows the percentage the priced rows share and ignores empty rows', async () => {
      renderTable(
        <Host
          pieces={[shirt, skirt]}
          initialTexts={{ 'EUR/DE': '135,00', ...empty }}
          initialModes={{ 'EUR/DE': 'percent', ...emptyModes }}
        />
      );
      await screen.findByTestId('price-row-EUR/DE');
      expect(global()).toHaveValue('10');
    });

    it('stays empty when the only priced row is in price mode', async () => {
      renderTable(
        <Host
          pieces={[shirt, skirt]}
          initialTexts={{ 'EUR/DE': '135,00', ...empty }}
          initialModes={{ 'EUR/DE': 'price', ...emptyModes }}
        />
      );
      await screen.findByTestId('price-row-EUR/DE');
      expect(global()).toHaveValue('');
    });

    it('stays empty when no row has a price', async () => {
      renderTable(
        <Host
          pieces={[shirt, skirt]}
          initialTexts={{ 'EUR/DE': '', ...empty }}
          initialModes={{ 'EUR/DE': 'percent', ...emptyModes }}
        />
      );
      await screen.findByTestId('price-row-EUR/DE');
      expect(global()).toHaveValue('');
    });
  });

  it('applies a global percentage to every row in percent mode', async () => {
    const user = userEvent.setup();
    renderTable(<Host pieces={[shirt, skirt]} />);
    await screen.findByTestId('price-row-EUR/DE');
    await user.type(global(), '20');
    await user.tab();
    expect(amount('EUR DE')).toHaveValue('120,00');
    expect(amount('EUR FR')).toHaveValue('128,00');
    expect(amount('GBP GB')).toHaveValue('108,00');
    expect(percent('EUR FR')).toHaveValue('20');
    expect(lastModes).toEqual({
      'EUR/DE': 'percent',
      'EUR/FR': 'percent',
      'GBP/GB': 'percent',
    });
    expect(kind('EUR/FR')).toHaveTextContent('Prozent');
  });

  it('switches only the edited row back to price mode, and a percent edit to percent mode', async () => {
    const user = userEvent.setup();
    renderTable(<Host pieces={[shirt, skirt]} />);
    await screen.findByTestId('price-row-EUR/DE');
    await user.type(global(), '20');
    await user.tab();

    await user.clear(amount('EUR DE'));
    await user.type(amount('EUR DE'), '140');
    await user.tab();
    expect(lastModes['EUR/DE']).toBe('price');
    expect(lastModes['EUR/FR']).toBe('percent');
    expect(kind('EUR/DE')).toHaveTextContent('Betrag');
    expect(kind('EUR/FR')).toHaveTextContent('Prozent');

    await user.clear(percent('EUR DE'));
    await user.type(percent('EUR DE'), '10');
    await user.tab();
    expect(lastModes['EUR/DE']).toBe('percent');
    expect(amount('EUR DE')).toHaveValue('135,00');
  });

  it('changes nothing when the global percentage is cleared', async () => {
    const user = userEvent.setup();
    renderTable(<Host pieces={[shirt, skirt]} />);
    await screen.findByTestId('price-row-EUR/DE');
    await user.type(global(), '20');
    await user.tab();
    await user.clear(global());
    await user.tab();
    expect(amount('EUR DE')).toHaveValue('120,00');
    expect(lastModes['EUR/DE']).toBe('percent');
  });

  it('disables the global field when the table is disabled', async () => {
    renderTable(<Host pieces={[shirt, skirt]} isDisabled />);
    await screen.findByTestId('price-row-EUR/DE');
    expect(global()).toBeDisabled();
  });
});
