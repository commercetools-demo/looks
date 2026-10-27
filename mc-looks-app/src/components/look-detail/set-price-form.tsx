import { useState } from 'react';
import { useIntl, type IntlShape } from 'react-intl';
import {
  Alert,
  Button,
  Card,
  Flex,
  FormField,
  Heading,
  Stack,
  Text,
  TextInput,
  toast,
} from '@commercetools/nimbus';
import { formatMoney } from '../../domain/format';
import type { LookRow } from '../../domain/look-rows';
import { SetPriceStepError, changeSetPrice } from '../../domain/look-writes';
import type { LookDiscount, LookObject, Money } from '../../domain/types';
import { validateLook, type ValidationError } from '../../domain/validate';
import { useCanManage, useCurrencies, useLookApi } from '../../hooks/context';
import { describeError } from '../common/describe-error';
import { useMoney } from '../common/look-hooks';
import commonMessages from '../common/messages';
import messages from './messages';

/** Cents from text with a comma or a dot as decimal mark; `NaN` when unreadable. */
export function parseCents(text: string): number {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}

const initialText = (intl: IntlShape, cents: number | undefined): string =>
  cents === undefined
    ? ''
    : intl.formatNumber(cents / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: false,
      });

/** Set price per project currency, with the live sum and the saving. */
export function SetPriceForm({
  row,
  apply,
  reload,
}: {
  row: LookRow;
  apply: (discount?: LookDiscount, object?: LookObject) => void;
  reload: () => void;
}) {
  const intl = useIntl();
  const api = useLookApi();
  const currencies = useCurrencies();
  const canManage = useCanManage();
  const money = useMoney();
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      currencies.map((c) => [c, initialText(intl, row.setPrice?.[c])])
    )
  );
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [failure, setFailure] = useState<string>();
  const [stale, setStale] = useState<Money>();
  const [unchanged, setUnchanged] = useState(false);
  const [busy, setBusy] = useState(false);

  const entered: Money = Object.fromEntries(
    currencies.map((c) => [c, parseCents(texts[c] ?? '')])
  );

  async function save(
    setPrice: Money,
    options: { discountChanged?: boolean } = {}
  ) {
    setFailure(undefined);
    setUnchanged(false);
    if (!options.discountChanged) {
      const livePrices = new Map(
        row.pieces.flatMap((piece) =>
          piece ? [[piece.id, piece.prices] as const] : []
        )
      );
      const label = { de: row.lookKey, en: row.lookKey };
      const found = validateLook(
        {
          label,
          componentProductIds: row.pieceIds,
          setPrice,
          sum: row.liveSum,
        },
        livePrices,
        currencies
      );
      setErrors(found);
      if (found.length > 0) return;
    }
    setBusy(true);
    try {
      const result = await changeSetPrice(
        api,
        row,
        setPrice,
        row.liveSum,
        options
      );
      setStale(undefined);
      if (result.unchanged) {
        setUnchanged(true);
        return;
      }
      toast.success({ title: intl.formatMessage(messages.setPriceSaved) });
      if (options.discountChanged) reload();
      else apply(result.discount, result.object);
    } catch (error) {
      if (
        error instanceof SetPriceStepError &&
        (error.step === 'object' || error.discountChanged)
      ) {
        setStale(setPrice);
      } else {
        setFailure(
          describeError(
            intl,
            error instanceof SetPriceStepError ? error.original : error
          )
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const errorText = (currency: string): string | undefined => {
    const error = errors.find(
      (e) => e.field === 'setPrice' && e.currency === currency
    );
    if (!error) return undefined;
    if (error.code === 'set-price-not-below-sum') {
      return intl.formatMessage(messages.errNotBelowSum, {
        sum: money(row.liveSum[currency], currency),
      });
    }
    if (error.code === 'sum-not-live')
      return intl.formatMessage(messages.errSumNotLive);
    return intl.formatMessage(messages.errNotPositive);
  };
  const piecesError = errors.some((e) => e.field === 'pieces');
  const disabled = busy || !canManage;

  return (
    <Card.Root>
      <Card.Body>
        <Stack gap="400">
          <Heading as="h2" size="md">
            {intl.formatMessage(messages.setPriceTitle)}
          </Heading>
          {row.priceDrift && (
            <Alert.Root colorPalette="warning">
              <Alert.Title>
                {intl.formatMessage(commonMessages.priceDrift)}
              </Alert.Title>
              <Alert.Description>
                {intl.formatMessage(messages.driftDescription)}
              </Alert.Description>
              <Alert.Actions>
                <Button
                  size="xs"
                  variant="outline"
                  isDisabled={disabled || !row.setPrice}
                  onPress={() => row.setPrice && void save(row.setPrice)}
                >
                  {intl.formatMessage(messages.recalculate)}
                </Button>
              </Alert.Actions>
            </Alert.Root>
          )}
          {stale && (
            <Alert.Root colorPalette="warning">
              <Alert.Title>
                {intl.formatMessage(messages.staleTitle)}
              </Alert.Title>
              <Alert.Description>
                {intl.formatMessage(messages.staleDescription)}
              </Alert.Description>
              <Alert.Actions>
                <Button
                  size="xs"
                  variant="outline"
                  isDisabled={disabled}
                  onPress={() => void save(stale, { discountChanged: true })}
                >
                  {intl.formatMessage(commonMessages.retry)}
                </Button>
              </Alert.Actions>
            </Alert.Root>
          )}
          <Flex gap="600" wrap="wrap">
            {currencies.map((currency) => {
              const cents = entered[currency];
              const sum = row.liveSum[currency];
              const saving =
                sum !== undefined && cents > 0 ? sum - cents : undefined;
              const error = errorText(currency);
              const label = intl.formatMessage(messages.setPriceLabel, {
                currency,
              });
              return (
                <Stack key={currency} gap="100" flex="1" minWidth="220px">
                  <FormField.Root
                    isInvalid={Boolean(error)}
                    isDisabled={disabled}
                  >
                    <FormField.Label>{label}</FormField.Label>
                    <FormField.Input>
                      <TextInput
                        aria-label={label}
                        inputMode="decimal"
                        value={texts[currency] ?? ''}
                        onChange={(value) => {
                          setTexts((current) => ({
                            ...current,
                            [currency]: value,
                          }));
                          setUnchanged(false);
                        }}
                      />
                    </FormField.Input>
                    {error && <FormField.Error>{error}</FormField.Error>}
                  </FormField.Root>
                  <Text fontSize="300" color="neutral.11">
                    {intl.formatMessage(messages.sumLine, {
                      sum: money(sum, currency),
                    })}
                  </Text>
                  {saving !== undefined && sum !== undefined && saving > 0 && (
                    <Text fontSize="300" color="neutral.11">
                      {intl.formatMessage(messages.savingLine, {
                        amount: formatMoney(saving, currency, intl.locale),
                        percent: Math.round((saving / sum) * 100),
                      })}
                    </Text>
                  )}
                </Stack>
              );
            })}
          </Flex>
          {piecesError && (
            <Alert.Root colorPalette="critical">
              <Alert.Description>
                {intl.formatMessage(messages.errPieces)}
              </Alert.Description>
            </Alert.Root>
          )}
          {failure && (
            <Alert.Root colorPalette="critical">
              <Alert.Description>{failure}</Alert.Description>
            </Alert.Root>
          )}
          <Flex gap="300" alignItems="center">
            <Button
              variant="solid"
              colorPalette="primary"
              isDisabled={disabled}
              onPress={() => void save(entered)}
            >
              {intl.formatMessage(messages.setPriceSave)}
            </Button>
            {unchanged && (
              <Text color="neutral.11">
                {intl.formatMessage(messages.noChange)}
              </Text>
            )}
          </Flex>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
