import { useEffect, useMemo, type FC } from 'react';
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

type SetPriceTableProps = {
  pieces: ReadonlyArray<Pick<Piece, 'id' | 'name' | 'prices'>>;
  texts: Record<string, string>;
  onTextsChange: (texts: Record<string, string>) => void;
  errors: Record<string, string | undefined>;
  isDisabled: boolean;
};

/**
 * The set-price table: one row per currency and country in which every piece
 * has a price, ordered by currency, with the pieces' master-variant prices,
 * their sum, the set price (money field) and the saving in percent (number
 * field). Typing a set price updates the percentage and the other way round.
 * `texts` holds the set-price text per row key; a row without text yet starts
 * at the sum, an emptied one gets no discount.
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
  const { texts, onTextsChange } = props;
  const setText = (key: string, text: string) =>
    onTextsChange({ ...texts, [key]: text });
  // Rows that have no text yet start at the sum.
  useEffect(() => {
    const missing = rows.filter((row) => texts[row.key] === undefined);
    if (missing.length === 0) return;
    onTextsChange({
      ...texts,
      ...Object.fromEntries(
        missing.map((row) => [row.key, amountText(row.sum)])
      ),
    });
  }, [rows, texts, onTextsChange]);

  return (
    <Stack gap="300">
      <Text color="neutral.11">
        {intl.formatMessage(messages.priceTableHint)}
      </Text>
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
                        setText(row.key, amount === 'NaN' ? '' : amount)
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
                          setText(
                            row.key,
                            amountText(priceFromPercent(row.sum, value))
                          );
                        }
                      }}
                    />
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
