import type { ReactNode } from 'react';
import { useIntl } from 'react-intl';
import {
  Box,
  Card,
  Flex,
  Grid,
  Heading,
  Stack,
  Switch,
  Text,
} from '@commercetools/nimbus';
import type { Money, Piece } from '../../domain/types';
import { useCurrencies } from '../../hooks/context';
import { MoneyLines } from '../common/money-lines';
import { PieceImage } from '../common/piece-image';
import { useMoney } from '../common/look-hooks';
import messages from './messages';

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Grid templateColumns="160px minmax(0, 1fr)" gap="400" alignItems="start">
      <Text color="neutral.11">{label}</Text>
      <Box minWidth={0} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {children}
      </Box>
    </Grid>
  );
}

/** Step 4: the summary and the switch "Nach dem Anlegen aktiv" (off by
 *  default, so a look can be checked before it goes live). */
export function ReviewStep(props: {
  name: { de: string; en: string };
  photoPath: string | undefined;
  pieces: Piece[];
  sum: Money;
  setPrice: Money;
  activate: boolean;
  onActivateChange: (activate: boolean) => void;
  isDisabled: boolean;
}) {
  const intl = useIntl();
  const money = useMoney();
  const currencies = useCurrencies();
  const saving = Object.fromEntries(
    currencies.flatMap((currency) =>
      props.sum[currency] !== undefined &&
      props.sum[currency] > props.setPrice[currency]
        ? [[currency, props.sum[currency] - props.setPrice[currency]]]
        : []
    )
  );
  return (
    <Card.Root maxWidth="720px">
      <Card.Header>
        <Heading as="h3" size="md">
          {intl.formatMessage(messages.reviewTitle)}
        </Heading>
      </Card.Header>
      <Card.Body>
        <Stack gap="300">
          <SummaryRow label={intl.formatMessage(messages.reviewName)}>
            <Text fontWeight="500">
              {props.name.de} / {props.name.en}
            </Text>
          </SummaryRow>
          <SummaryRow label={intl.formatMessage(messages.reviewPhoto)}>
            {props.photoPath ?? intl.formatMessage(messages.reviewNoPhoto)}
          </SummaryRow>
          <SummaryRow label={intl.formatMessage(messages.reviewSum)}>
            <MoneyLines value={props.sum} align="flex-start" />
          </SummaryRow>
          <SummaryRow label={intl.formatMessage(messages.reviewSetPrice)}>
            <MoneyLines value={props.setPrice} strong align="flex-start" />
          </SummaryRow>
          <SummaryRow label={intl.formatMessage(messages.reviewSaving)}>
            {currencies
              .filter((currency) => saving[currency] !== undefined)
              .map((currency) => (
                <Text key={currency}>{money(saving[currency], currency)}</Text>
              ))}
          </SummaryRow>
          <SummaryRow label={intl.formatMessage(messages.reviewPieces)}>
            <Stack gap="200">
              {props.pieces.map((piece) => (
                <Flex key={piece.id} alignItems="center" gap="300">
                  <PieceImage src={piece.imageUrl} width={32} />
                  <Text flex="1" minWidth={0} truncate>
                    {piece.name}
                  </Text>
                  <Text color="neutral.11">
                    {money(piece.prices[currencies[0]], currencies[0])}
                  </Text>
                </Flex>
              ))}
            </Stack>
          </SummaryRow>
          <Switch
            isSelected={props.activate}
            onChange={props.onActivateChange}
            isDisabled={props.isDisabled}
          >
            {intl.formatMessage(messages.activateLabel)}
          </Switch>
          <Text fontSize="300" color="neutral.11">
            {intl.formatMessage(messages.activateHelp)}
          </Text>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
