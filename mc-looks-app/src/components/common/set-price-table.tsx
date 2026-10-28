import { useEffect, useMemo, useState, type FC } from 'react';
import { useIntl } from 'react-intl';
import {
  Box,
  type CurrencyCode,
  MoneyInput,
  NumberInput,
  Stack,
  Table,
  Text,
} from '@commercetools/nimbus';
import {
  percentOf,
  priceFromPercent,
  priceTableRows,
} from '../../domain/price-table';
import type { Piece } from '../../domain/types';
import { useCurrencies } from '../../hooks/context';
import { parseCents } from '../new-look/set-price';
import { useMoney } from './look-hooks';
import messages from './messages';

/** The country as its name in the user's language, with the code as title. */
function useCountryName() {
  const intl = useIntl();
  return (code: string): string => {
    try {
      return (
        new Intl.DisplayNames([intl.locale], { type: 'region' }).of(code) ??
        code
      );
    } catch {
      return code;
    }
  };
}

/** An amount as the money field wants it: a dot as decimal mark. */
export const amountText = (cents: number): string => (cents / 100).toFixed(2);

/** How a row's discount is defined: by the set price (an absolute discount)
 *  or by the saving in percent (a relative one). */
export type PriceMode = 'price' | 'percent';

export interface PriceTableState {
  texts: Record<string, string>;
  /** A row without an entry is in price mode. */
  modes: Record<string, PriceMode>;
}

type SetPriceTableProps = {
  pieces: ReadonlyArray<Pick<Piece, 'id' | 'name' | 'prices'>>;
  texts: Record<string, string>;
  modes: Record<string, PriceMode>;
  onChange: (next: PriceTableState) => void;
  errors: Record<string, string | undefined>;
  isDisabled: boolean;
};

/**
 * The set-price table: one row per currency and country in which every piece
 * has a price, ordered by currency, with the pieces' master-variant prices,
 * their sum, the set price (money field) and the saving in percent (number
 * field). Typing a set price updates the percentage and the other way round.
 * `texts` holds the set-price text per row key; a row without text yet starts
 * at the sum, an emptied one gets no discount. `modes` says per row which
 * field was edited last (percent: a relative discount, else an absolute one;
 * shown in the "Rabatt" column). The field above the table sets every row to
 * one percentage.
 */
export const SetPriceTable: FC<SetPriceTableProps> = (props) => {
  const intl = useIntl();
  const money = useMoney();
  const currencies = useCurrencies();
  const countryName = useCountryName();
  const rows = useMemo(
    () => priceTableRows(props.pieces, currencies),
    [props.pieces, currencies]
  );
  const { texts, modes, onChange } = props;
  // What the user last committed in the global field; the field itself shows
  // the percentage every row shares (see `sharedPercent`), so a global
  // percentage chosen earlier is still there after the table is shown again
  // (another step, the detail page).
  const [typedPercent, setTypedPercent] = useState(Number.NaN);
  const modeOf = (key: string): PriceMode => modes[key] ?? 'price';
  const setRow = (key: string, text: string, mode: PriceMode) =>
    onChange({
      texts: { ...texts, [key]: text },
      modes: { ...modes, [key]: mode },
    });
  // Every row that has a set price is in percent mode with (about) the same
  // saving: that saving. Rows without a price are ignored, and at least one
  // row needs a price. Rounding a price to cents can move a saving by a tenth.
  const pricedRows = rows.filter((row) => (texts[row.key] ?? '').trim() !== '');
  const known = pricedRows
    .map((row) =>
      modeOf(row.key) === 'percent'
        ? percentOf(row.sum, parseCents(texts[row.key] ?? ''))
        : undefined
    )
    .filter((percent): percent is number => percent !== undefined);
  const sharedPercent =
    pricedRows.length > 0 &&
    known.length === pricedRows.length &&
    Math.max(...known) - Math.min(...known) <= 0.2
      ? Math.round(
          (known.reduce((sum, value) => sum + value, 0) / known.length) * 10
        ) / 10
      : Number.NaN;
  const globalPercent =
    Number.isFinite(typedPercent) &&
    Number.isFinite(sharedPercent) &&
    Math.abs(typedPercent - sharedPercent) <= 0.2
      ? typedPercent
      : sharedPercent;
  const applyGlobal = (percent: number) =>
    onChange({
      texts: {
        ...texts,
        ...Object.fromEntries(
          rows.map((row) => [
            row.key,
            amountText(priceFromPercent(row.sum, percent)),
          ])
        ),
      },
      modes: {
        ...modes,
        ...Object.fromEntries(rows.map((row) => [row.key, 'percent' as const])),
      },
    });
  // Rows that have no text yet start at the sum.
  useEffect(() => {
    const missing = rows.filter((row) => texts[row.key] === undefined);
    if (missing.length === 0) return;
    onChange({
      texts: {
        ...texts,
        ...Object.fromEntries(
          missing.map((row) => [row.key, amountText(row.sum)])
        ),
      },
      modes,
    });
  }, [rows, texts, modes, onChange]);

  return (
    <Stack gap="300">
      <Text color="neutral.11">
        {intl.formatMessage(messages.priceTableHint)}
      </Text>
      <Stack gap="100" maxWidth="260px">
        <Text id="price-table-global-percent" fontWeight="500">
          {intl.formatMessage(messages.priceTableGlobalPercent)}
        </Text>
        <NumberInput
          aria-labelledby="price-table-global-percent"
          isDisabled={props.isDisabled}
          minValue={0}
          maxValue={99.9}
          step={0.1}
          formatOptions={{ maximumFractionDigits: 1 }}
          value={globalPercent}
          onChange={(value) => {
            setTypedPercent(value);
            if (Number.isFinite(value) && value > 0) applyGlobal(value);
          }}
        />
      </Stack>
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>
                {intl.formatMessage(messages.priceTableCurrency)}
              </Table.ColumnHeader>
              <Table.ColumnHeader>
                {intl.formatMessage(messages.priceTableCountry)}
              </Table.ColumnHeader>
              {props.pieces.map((piece) => (
                <Table.ColumnHeader key={piece.id} title={piece.name}>
                  {piece.name}
                </Table.ColumnHeader>
              ))}
              <Table.ColumnHeader>
                {intl.formatMessage(messages.priceTableSum)}
              </Table.ColumnHeader>
              <Table.ColumnHeader>
                {intl.formatMessage(messages.priceTableSetPrice)}
              </Table.ColumnHeader>
              <Table.ColumnHeader>
                {intl.formatMessage(messages.priceTableSaving)}
              </Table.ColumnHeader>
              <Table.ColumnHeader>
                {intl.formatMessage(messages.priceTableDiscount)}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => {
              const cents = parseCents(props.texts[row.key] ?? '');
              const percent = percentOf(row.sum, cents);
              const error = props.errors[row.key];
              const labelValues = {
                currency: row.currency,
                country: row.country,
              };
              const priceLabel = row.country
                ? intl.formatMessage(messages.priceTableCellLabel, labelValues)
                : `${intl.formatMessage(messages.priceTableSetPrice)} ${
                    row.currency
                  }`;
              return (
                <Table.Row key={row.key} data-testid={`price-row-${row.key}`}>
                  <Table.Cell>{row.currency}</Table.Cell>
                  <Table.Cell title={row.country}>
                    {row.country
                      ? countryName(row.country)
                      : intl.formatMessage(messages.priceTableCountryAll)}
                  </Table.Cell>
                  {row.prices.map((price, index) => (
                    <Table.Cell
                      key={props.pieces[index].id}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {money(price, row.currency)}
                    </Table.Cell>
                  ))}
                  <Table.Cell style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {money(row.sum, row.currency)}
                  </Table.Cell>
                  <Table.Cell>
                    <MoneyInput
                      aria-label={priceLabel}
                      isDisabled={props.isDisabled}
                      isInvalid={Boolean(error)}
                      value={{
                        amount: props.texts[row.key] ?? '',
                        currencyCode: row.currency as CurrencyCode,
                      }}
                      onAmountChange={(amount) =>
                        // A cleared field reports "NaN": an empty row.
                        setRow(row.key, amount === 'NaN' ? '' : amount, 'price')
                      }
                    />
                    {error && (
                      <Text color="critical.11" fontSize="300" role="alert">
                        {error}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <NumberInput
                      aria-label={intl.formatMessage(
                        messages.priceTablePercentLabel,
                        labelValues
                      )}
                      isDisabled={props.isDisabled}
                      minValue={0}
                      maxValue={99.9}
                      step={0.1}
                      formatOptions={{ maximumFractionDigits: 1 }}
                      value={percent ?? Number.NaN}
                      onChange={(value) => {
                        if (Number.isFinite(value)) {
                          setRow(
                            row.key,
                            amountText(priceFromPercent(row.sum, value)),
                            'percent'
                          );
                        }
                      }}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    {intl.formatMessage(
                      modeOf(row.key) === 'percent'
                        ? messages.priceTableModePercent
                        : messages.priceTableModeAmount
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </Stack>
  );
};
