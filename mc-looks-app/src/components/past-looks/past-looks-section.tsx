import { useMemo, type FC } from 'react';
import { useIntl } from 'react-intl';
import {
  Alert,
  Button,
  Grid,
  Heading,
  Skeleton,
  Stack,
  Text,
} from '@commercetools/nimbus';
import { PAGE } from '../../domain/limits';
import { isPastLook, type LookRow } from '../../domain/look-rows';
import { buildPastLooks } from '../../domain/past-looks';
import type { LookDiscount, LookObject } from '../../domain/types';
import { useDataLocale } from '../../hooks/context';
import { ORDERS_PAGE_LIMIT } from '../../hooks/use-looks-connector/look-api';
import { usePastLookSales } from '../../hooks/use-past-look-sales';
import { describeError } from '../common/describe-error';
import commonMessages from '../common/messages';
import { PastLookCard, PAST_STRIP_HEIGHT } from './past-look-card';
import messages from './messages';

/** Cards per row at 1440 px; every column is `1fr`, so all shrink together. */
export const PAST_CARDS_PER_ROW = 4;

const GRID = {
  base: 'repeat(2, minmax(0, 1fr))',
  xl: `repeat(${PAST_CARDS_PER_ROW}, minmax(0, 1fr))`,
};

type PastLooksSectionProps = {
  rows: LookRow[];
  onOpen: (lookKey: string) => void;
  onDiscountChange: (
    discount: LookDiscount,
    object?: LookObject,
    more?: LookDiscount[]
  ) => void;
};

/**
 * "Frühere Looks": the switched-off looks as cards, best seller first. The
 * sales come from an independent order read; the looks above stay usable
 * whatever it does, and the cards stay usable when it fails.
 */
export const PastLooksSection: FC<PastLooksSectionProps> = ({
  rows,
  onOpen,
  onDiscountChange,
}) => {
  const intl = useIntl();
  const dataLocale = useDataLocale();
  const hasPast = useMemo(() => rows.some(isPastLook), [rows]);
  const { state, retry } = usePastLookSales(hasPast);
  const cards = useMemo(
    () =>
      buildPastLooks(
        rows,
        state.status === 'ready' ? state.orders : [],
        dataLocale
      ),
    [rows, state, dataLocale]
  );

  return (
    <Stack gap="400" data-testid="past-looks" pt="400">
      <Stack gap="100">
        <Heading as="h2" size="lg">
          {intl.formatMessage(messages.title)}
        </Heading>
        <Text color="neutral.11">
          {intl.formatMessage(messages.description)}
        </Text>
      </Stack>

      {!hasPast ? (
        <Stack
          gap="200"
          alignItems="center"
          textAlign="center"
          p="1200"
          borderWidth="1px"
          borderColor="neutral.6"
          borderRadius="300"
          bg="neutral.1"
        >
          <Text fontWeight="600" fontSize="450">
            {intl.formatMessage(messages.empty)}
          </Text>
          <Text color="neutral.11">
            {intl.formatMessage(messages.emptyDescription)}
          </Text>
        </Stack>
      ) : (
        <>
          {state.status === 'error' && (
            <Alert.Root colorPalette="critical">
              <Alert.Title>
                {intl.formatMessage(messages.errorTitle)}
              </Alert.Title>
              <Alert.Description>
                {intl.formatMessage(messages.errorNote)}{' '}
                {describeError(intl, state.error)}
              </Alert.Description>
              <Alert.Actions>
                <Button size="xs" variant="outline" onPress={retry}>
                  {intl.formatMessage(commonMessages.retry)}
                </Button>
              </Alert.Actions>
            </Alert.Root>
          )}
          {state.status === 'ready' && state.truncated && (
            <Text color="neutral.11" fontSize="350">
              {intl.formatMessage(messages.truncated, {
                count: PAGE * ORDERS_PAGE_LIMIT,
              })}
            </Text>
          )}
          {state.status === 'loading' ? (
            <Grid
              templateColumns={GRID}
              gap="500"
              role="status"
              aria-label={intl.formatMessage(commonMessages.loading)}
            >
              {cards.slice(0, PAST_CARDS_PER_ROW).map((card) => (
                <Stack
                  key={card.lookKey}
                  data-testid="past-look-skeleton"
                  gap="300"
                  p="400"
                  borderWidth="1px"
                  borderColor="neutral.6"
                  borderRadius="300"
                >
                  <Skeleton height={`${PAST_STRIP_HEIGHT}px`} width="140px" />
                  <Skeleton height="16px" width="60%" />
                  <Skeleton height="12px" width="80%" />
                  <Skeleton height="36px" />
                </Stack>
              ))}
            </Grid>
          ) : (
            <Grid
              templateColumns={GRID}
              gap="500"
              role="list"
              aria-label={intl.formatMessage(messages.title)}
            >
              {cards.map((card, index) => (
                <PastLookCard
                  key={card.lookKey}
                  past={card}
                  best={
                    index === 0 && state.status === 'ready' && card.setsSold > 0
                  }
                  figures={state.status === 'ready'}
                  onOpen={onOpen}
                  onDiscountChange={onDiscountChange}
                />
              ))}
            </Grid>
          )}
        </>
      )}
    </Stack>
  );
};
