import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import {
  screen,
  within,
} from '@commercetools-frontend/application-shell/test-utils';
import type { Piece } from '../../domain/types';
import { renderUi } from '../../test-utils/render-ui';
import { buildPiece } from '../../test-utils/fixtures';
import { SetPriceTable } from './set-price-table';

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

function Host(props: {
  pieces: Piece[];
  errors?: Record<string, string | undefined>;
  isDisabled?: boolean;
}) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  lastTexts = texts;
  return (
    <SetPriceTable
      pieces={props.pieces}
      texts={texts}
      onTextsChange={setTexts}
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
});
