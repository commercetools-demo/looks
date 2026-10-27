import { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Alert,
  Button,
  Card,
  Flex,
  Heading,
  Stack,
  Text,
  toast,
} from '@commercetools/nimbus';
import type { LookRow } from '../../domain/look-rows';
import { SetPriceStepError, changeSetPrice } from '../../domain/look-writes';
import type { LookDiscount, LookObject, Money } from '../../domain/types';
import { splitPriceKey } from '../../domain/prices';
import { validateLook, type ValidationError } from '../../domain/validate';
import { useCanManage, useLookApi } from '../../hooks/context';
import { describeError } from '../common/describe-error';
import { SetPriceTable, amountText } from '../common/set-price-table';
import { parseCents } from '../new-look/set-price';
import { useMoney } from '../common/look-hooks';
import commonMessages from '../common/messages';
import messages from './messages';

/** Set prices per currency and country, in the shared price table. */
export function SetPriceForm({
  row,
  apply,
  reload,
}: {
  row: LookRow;
  apply: (
    discount?: LookDiscount,
    object?: LookObject,
    more?: LookDiscount[]
  ) => void;
  reload: () => void;
}) {
  const intl = useIntl();
  const api = useLookApi();
  const canManage = useCanManage();
  const money = useMoney();
  // Only price rows every piece has a price in can get a set price.
  const cells = Object.keys(row.liveSum);
  const pieces = row.pieces.filter(
    (piece): piece is NonNullable<typeof piece> => piece !== undefined
  );
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      cells.map((key) => [
        key,
        row.setPrice?.[key] === undefined ? '' : amountText(row.setPrice[key]),
      ])
    )
  );
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [failure, setFailure] = useState<string>();
  const [stale, setStale] = useState<Money>();
  const [unchanged, setUnchanged] = useState(false);
  const [busy, setBusy] = useState(false);

  // A row without a stored set price stays without a discount while empty;
  // a stored one cannot be emptied (its discount would keep the old amount).
  const entered: Money = Object.fromEntries(
    cells.flatMap((key) => {
      const text = (texts[key] ?? '').trim();
      if (text === '' && row.setPrice?.[key] === undefined) return [];
      return [[key, parseCents(text) ?? 0]];
    })
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
      const label = { en: row.lookKey };
      const found = validateLook(
        {
          label,
          componentProductIds: row.pieceIds,
          setPrice,
          sum: row.liveSum,
        },
        livePrices,
        cells
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
      else apply(result.discount, result.object, result.discounts);
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

  const errorText = (key: string): string | undefined => {
    const error = errors.find(
      (e) => e.field === 'setPrice' && e.currency === key
    );
    if (!error) return undefined;
    if (error.code === 'set-price-not-below-sum') {
      return intl.formatMessage(messages.errNotBelowSum, {
        sum: money(row.liveSum[key], splitPriceKey(key).currency),
      });
    }
    if (error.code === 'sum-not-live')
      return intl.formatMessage(messages.errSumNotLive);
    return intl.formatMessage(messages.errNotPositive);
  };
  const rowErrors = Object.fromEntries(
    cells.map((key) => [key, errorText(key)])
  );
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
          <SetPriceTable
            pieces={pieces}
            texts={texts}
            onTextsChange={(next) => {
              setTexts(next);
              setUnchanged(false);
            }}
            errors={rowErrors}
            isDisabled={disabled}
          />
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
