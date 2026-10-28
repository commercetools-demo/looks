import type { FC, ReactNode } from 'react';
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
import type { LocalizedValue, Money, Piece } from '../../domain/types';
import { sortPriceKeys, splitPriceKey } from '../../domain/prices';
import { useCurrencies } from '../../hooks/context';
import { PieceImage } from '../common/piece-image';
import { useMoney } from '../common/look-hooks';
import messages from './messages';

type SummaryRowProps = {
  label: string;
  children: ReactNode;
};

const SummaryRow: FC<SummaryRowProps> = ({ label, children }) => {
  return (
    <Grid templateColumns="160px minmax(0, 1fr)" gap="400" alignItems="start">
      <Text color="neutral.11">{label}</Text>
      <Box minWidth={0} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {children}
      </Box>
    </Grid>
  );
};

type ReviewStepProps = {
  name: LocalizedValue;
  description: LocalizedValue;
  /** The full key, `look-<key>`. */
  fullKey: string;
  photoPath: string | undefined;
  pieces: Piece[];
  sum: Money;
  setPrice: Money;
  activate: boolean;
  onActivateChange: (activate: boolean) => void;
  isDisabled: boolean;
};

/** Step 4: the summary and the switch "Nach dem Anlegen aktiv" (off by
 *  default, so a look can be checked before it goes live). */
export const ReviewStep: FC<ReviewStepProps> = (props) => {
  const intl = useIntl();
  const money = useMoney();
  const currencies = useCurrencies();
  const cells = sortPriceKeys(Object.keys(props.setPrice), currencies);
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
              {Object.values(props.name).join(' / ')}
            </Text>
          </SummaryRow>
          {Object.keys(props.description).length > 0 && (
            <SummaryRow label={intl.formatMessage(messages.reviewDescription)}>
              <Text>{Object.values(props.description).join(' / ')}</Text>
            </SummaryRow>
          )}
          <SummaryRow label={intl.formatMessage(messages.reviewKey)}>
            <Text fontFamily="mono">{props.fullKey}</Text>
          </SummaryRow>
          <SummaryRow label={intl.formatMessage(messages.reviewPhoto)}>
            {props.photoPath ?? intl.formatMessage(messages.reviewNoPhoto)}
          </SummaryRow>
          <SummaryRow label={intl.formatMessage(messages.reviewSetPrice)}>
            <Stack gap="100">
              {cells.map((key) => {
                const { currency, country } = splitPriceKey(key);
                return (
                  <Text key={key}>
                    {intl.formatMessage(messages.reviewCell, {
                      cell: country ? `${currency} ${country}` : currency,
                      setPrice: money(props.setPrice[key], currency),
                      sum: money(props.sum[key], currency),
                      saving: money(
                        props.sum[key] - props.setPrice[key],
                        currency
                      ),
                    })}
                  </Text>
                );
              })}
            </Stack>
          </SummaryRow>
          <SummaryRow label={intl.formatMessage(messages.reviewPieces)}>
            <Stack gap="200">
              {props.pieces.map((piece) => (
                <Flex key={piece.id} alignItems="center" gap="300">
                  <PieceImage src={piece.imageUrl} width={32} />
                  <Text flex="1" minWidth={0} truncate>
                    {piece.name}
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
};
