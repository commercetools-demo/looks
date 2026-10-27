import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { ArrowDownward, ArrowUpward, Close } from '@commercetools/nimbus-icons';
import {
  Alert,
  DraggableList,
  Flex,
  Grid,
  Heading,
  Icon,
  IconButton,
  LoadingSpinner,
  SearchInput,
  Stack,
  Text,
} from '@commercetools/nimbus';
import { LOOK_MAX_PIECES, LOOK_MIN_PIECES } from '../../domain/limits';
import type { Money, Piece } from '../../domain/types';
import { useCurrencies, useLookApi } from '../../hooks/context';
import { describeError } from '../common/describe-error';
import { useMoney } from '../common/look-hooks';
import commonMessages from '../common/messages';
import { PieceImage } from '../common/piece-image';
import messages from './messages';
import { PieceResultCard } from './piece-result-card';

const SEARCH_DEBOUNCE_MS = 300;
/** Height of one chosen-piece row: the 48 px wide 4:5 image plus padding. */
const CHOSEN_ROW_HEIGHT = 68;

type ChosenItem = {
  key: string;
  label: string;
  piece: Piece;
  [field: string]: unknown;
};

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Step 2: the chosen pieces (reorderable) and the product search. */
export function PiecesStep(props: {
  pieces: Piece[];
  onPiecesChange: (pieces: Piece[]) => void;
  sum: Money;
  errors: string[];
  isDisabled: boolean;
}) {
  const intl = useIntl();
  const api = useLookApi();
  const money = useMoney();
  const currencies = useCurrencies();
  const { pieces, onPiecesChange } = props;
  const [text, setText] = useState('');
  const [results, setResults] = useState<Piece[] | undefined>();
  const [searchError, setSearchError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    // The first browse runs at once, typing waits for a pause.
    const timer = setTimeout(
      () => {
        setResults(undefined);
        api.searchPieces(text).then(
          (found) => {
            if (cancelled) return;
            setResults(found.pieces);
            setSearchError(undefined);
          },
          (error: unknown) => {
            if (cancelled) return;
            setResults([]);
            setSearchError(describeError(intl, error));
          }
        );
      },
      text ? SEARCH_DEBOUNCE_MS : 0
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, text, intl]);

  const chosenIds = new Set(pieces.map((piece) => piece.id));
  const full = pieces.length >= LOOK_MAX_PIECES;
  const items = useMemo<ChosenItem[]>(
    () => pieces.map((piece) => ({ key: piece.id, label: piece.name, piece })),
    [pieces]
  );
  const updateItems = (next: ChosenItem[]) => {
    if (props.isDisabled) return;
    if (
      next.map((item) => item.key).join('|') !==
      pieces.map((piece) => piece.id).join('|')
    ) {
      onPiecesChange(next.map((item) => item.piece));
    }
  };
  const prices = (piece: Piece) =>
    currencies
      .map((currency) => money(piece.prices[currency], currency))
      .join(' / ');
  const soldOutPieces = pieces.filter((piece) => piece.soldOutEverywhere);

  return (
    <Stack gap="600">
      <Heading as="h2" size="md">
        {intl.formatMessage(messages.piecesTitle, {
          min: LOOK_MIN_PIECES,
          max: LOOK_MAX_PIECES,
        })}
      </Heading>
      <Stack gap="300">
        <Heading as="h3" size="sm">
          {intl.formatMessage(messages.selectedHeading)}
        </Heading>
        {pieces.length === 0 ? (
          <Flex
            alignItems="center"
            justifyContent="center"
            width="100%"
            height={`${CHOSEN_ROW_HEIGHT}px`}
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="neutral.7"
            borderRadius="200"
            color="neutral.11"
          >
            {intl.formatMessage(messages.dropHint)}
          </Flex>
        ) : (
          <DraggableList.Root<ChosenItem>
            width="100%"
            aria-label={intl.formatMessage(messages.selectedHeading)}
            items={items}
            onUpdateItems={updateItems}
          >
            {(item: ChosenItem) => {
              const index = pieces.findIndex((piece) => piece.id === item.key);
              return (
                <DraggableList.Item id={item.key} textValue={item.label}>
                  <Flex alignItems="center" gap="300" width="100%" py="100">
                    <PieceImage src={item.piece.imageUrl} width={48} />
                    <Stack gap="0" flex="1" minWidth={0}>
                      <Text fontWeight="500" truncate title={item.label}>
                        {item.label}
                      </Text>
                      <Text
                        fontSize="300"
                        color="neutral.11"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {prices(item.piece)}
                      </Text>
                    </Stack>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      aria-label={`${intl.formatMessage(messages.moveUp)}: ${
                        item.label
                      }`}
                      isDisabled={props.isDisabled || index === 0}
                      onPress={() =>
                        onPiecesChange(move(pieces, index, index - 1))
                      }
                    >
                      <Icon>
                        <ArrowUpward />
                      </Icon>
                    </IconButton>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      aria-label={`${intl.formatMessage(messages.moveDown)}: ${
                        item.label
                      }`}
                      isDisabled={
                        props.isDisabled || index === pieces.length - 1
                      }
                      onPress={() =>
                        onPiecesChange(move(pieces, index, index + 1))
                      }
                    >
                      <Icon>
                        <ArrowDownward />
                      </Icon>
                    </IconButton>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      aria-label={`${intl.formatMessage(messages.remove)}: ${
                        item.label
                      }`}
                      isDisabled={props.isDisabled}
                      onPress={() =>
                        onPiecesChange(
                          pieces.filter((piece) => piece.id !== item.key)
                        )
                      }
                    >
                      <Icon>
                        <Close />
                      </Icon>
                    </IconButton>
                  </Flex>
                </DraggableList.Item>
              );
            }}
          </DraggableList.Root>
        )}
        {pieces.length > 0 && (
          <Text color="neutral.11" data-testid="pieces-chosen">
            {intl.formatMessage(messages.piecesCount, {
              count: pieces.length,
              sum: currencies
                .map((currency) => money(props.sum[currency], currency))
                .join(' / '),
            })}
          </Text>
        )}
        {props.errors.map((message) => (
          <Text key={message} color="critical.11" role="alert">
            {message}
          </Text>
        ))}
        {soldOutPieces.map((piece) => (
          <Alert.Root key={piece.id} colorPalette="warning">
            <Alert.Title>
              {intl.formatMessage(messages.soldOutTitle, { piece: piece.name })}
            </Alert.Title>
            <Alert.Description>
              {intl.formatMessage(messages.soldOutBody)}
            </Alert.Description>
          </Alert.Root>
        ))}
      </Stack>

      <Stack gap="300">
        <Heading as="h3" size="sm">
          {intl.formatMessage(messages.searchLabel)}
        </Heading>
        <SearchInput
          aria-label={intl.formatMessage(messages.searchLabel)}
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
          value={text}
          onChange={setText}
        />
        {searchError && <Text color="critical.11">{searchError}</Text>}
        {results === undefined ? (
          <LoadingSpinner
            aria-label={intl.formatMessage(commonMessages.loading)}
          />
        ) : results.length === 0 ? (
          <Text>{intl.formatMessage(messages.noProducts)}</Text>
        ) : (
          <Grid
            role="list"
            aria-label={intl.formatMessage(messages.resultsLabel)}
            templateColumns="repeat(auto-fill, minmax(150px, 1fr))"
            gap="400"
          >
            {results.map((piece) => (
              <Flex key={piece.id} role="listitem" minWidth={0}>
                <PieceResultCard
                  piece={piece}
                  isDisabled={props.isDisabled}
                  state={
                    chosenIds.has(piece.id)
                      ? 'in-look'
                      : full
                      ? 'full'
                      : 'available'
                  }
                  onAdd={() => onPiecesChange([...pieces, piece])}
                />
              </Flex>
            ))}
          </Grid>
        )}
      </Stack>
    </Stack>
  );
}
