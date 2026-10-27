import { useIntl } from 'react-intl';
import { Add, Check } from '@commercetools/nimbus-icons';
import { Box, Button, Flex, Icon, Stack, Text } from '@commercetools/nimbus';
import { stockStateOf } from '../../domain/stock';
import type { Piece } from '../../domain/types';
import commonMessages from '../common/messages';
import { PieceImage } from '../common/piece-image';
import messages from './messages';

export type CardState = 'available' | 'in-look' | 'full';

/** One search result: image, name, colour, prices per currency and country, size chips
 *  with "nur noch N" and "ausverkauft", and the add action. */
export function PieceResultCard(props: {
  piece: Piece;
  state: CardState;
  isDisabled: boolean;
  onAdd: () => void;
}) {
  const intl = useIntl();
  const { piece } = props;
  const entries = piece.oneSize
    ? [
        {
          label: intl.formatMessage(commonMessages.oneSize),
          quantity: piece.sizes[0]?.availableQuantity ?? 0,
        },
      ]
    : piece.sizes.map((size) => ({
        label: size.label,
        quantity: size.availableQuantity,
      }));
  const low = entries.filter((entry) => stockStateOf(entry.quantity) === 'low');
  const soldOut = entries.filter(
    (entry) => stockStateOf(entry.quantity) === 'sold-out'
  );
  return (
    <Flex
      direction="column"
      minWidth={0}
      borderWidth="1px"
      borderColor="neutral.6"
      borderRadius="300"
      overflow="hidden"
      bg="neutral.1"
      width="100%"
    >
      <PieceImage src={piece.imageUrl} />
      <Stack gap="200" p="250" flex="1" minWidth={0}>
        <Box minWidth={0}>
          <Text fontWeight="500" truncate title={piece.name}>
            {piece.name}
          </Text>
          {piece.colour && (
            <Text
              fontSize="300"
              color="neutral.11"
              truncate
              aria-label={intl.formatMessage(messages.pieceColour, {
                colour: piece.colour,
              })}
            >
              {piece.colour}
            </Text>
          )}
        </Box>
        {piece.oneSize ? (
          <Text fontSize="300">
            {intl.formatMessage(commonMessages.oneSize)}
          </Text>
        ) : (
          <Flex wrap="wrap" gap="100">
            {piece.sizes.map((size) => {
              const sold = stockStateOf(size.availableQuantity) === 'sold-out';
              return (
                <Box
                  key={size.sku ?? size.label}
                  as="span"
                  display="inline-flex"
                  alignItems="center"
                  height="20px"
                  px="150"
                  borderRadius="100"
                  fontSize="300"
                  fontWeight="500"
                  bg={sold ? 'transparent' : 'neutral.3'}
                  color={sold ? 'neutral.9' : 'neutral.12'}
                  textDecoration={sold ? 'line-through' : 'none'}
                >
                  {size.label}
                </Box>
              );
            })}
          </Flex>
        )}
        <Stack gap="0" minHeight="32px">
          {low.length > 0 && (
            <Text fontSize="300" color="warning.11">
              {low
                .map((entry) =>
                  intl.formatMessage(messages.stockLow, {
                    size: entry.label,
                    count: entry.quantity,
                  })
                )
                .join(' · ')}
            </Text>
          )}
          {soldOut.length > 0 && (
            <Text fontSize="300" color="critical.11">
              {intl.formatMessage(messages.stockSoldOut, {
                sizes: soldOut.map((entry) => entry.label).join(', '),
              })}
            </Text>
          )}
        </Stack>
        <Box flex="1" />
        {props.state === 'in-look' ? (
          <Flex
            alignItems="center"
            justifyContent="center"
            gap="100"
            height="32px"
            color="positive.11"
            fontWeight="500"
          >
            <Icon size="sm">
              <Check />
            </Icon>
            {intl.formatMessage(messages.inLook)}
          </Flex>
        ) : (
          <Button
            size="xs"
            variant="outline"
            aria-label={`${intl.formatMessage(messages.add)}: ${piece.name}${
              piece.colour ? ` (${piece.colour})` : ''
            }`}
            isDisabled={props.isDisabled || props.state === 'full'}
            onPress={props.onAdd}
          >
            <Icon size="2xs">
              <Add />
            </Icon>
            {intl.formatMessage(messages.add)}
          </Button>
        )}
      </Stack>
    </Flex>
  );
}
