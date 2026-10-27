import { useIntl } from 'react-intl';
import { Box, Flex, Stack, Text } from '@commercetools/nimbus';
import { stockStateOf, summarizeSizes } from '../../domain/stock';
import type { Piece } from '../../domain/types';
import commonMessages from '../common/messages';
import { MoneyLines } from '../common/money-lines';
import { PieceImage } from '../common/piece-image';
import messages from './messages';

/** One piece of a look: image, name, colour, list prices and stock per size. */
export function PieceCard({
  piece,
  pieceId,
}: {
  piece: Piece | undefined;
  pieceId: string;
}) {
  const intl = useIntl();
  const sizes = (piece?.sizes ?? []).map((size) => ({
    ...size,
    label: piece?.oneSize
      ? intl.formatMessage(commonMessages.oneSize)
      : size.label,
  }));
  const { low, soldOut } = summarizeSizes(sizes);
  const lines = [
    ...sizes
      .filter((size) => stockStateOf(size.availableQuantity) === 'ok')
      .map((size) =>
        intl.formatMessage(messages.stockOk, {
          size: size.label,
          count: size.availableQuantity,
        })
      ),
    ...low.map((size) =>
      intl.formatMessage(messages.stockLow, {
        size: size.label,
        count: size.quantity,
      })
    ),
    ...(soldOut.length > 0
      ? [
          intl.formatMessage(messages.stockSoldOut, {
            sizes: soldOut.join(', '),
          }),
        ]
      : []),
  ];
  return (
    <Flex
      data-piece-card=""
      gap="400"
      alignItems="flex-start"
      p="300"
      minWidth={0}
      borderWidth="1px"
      borderColor="neutral.6"
      borderRadius="300"
    >
      <PieceImage src={piece?.imageUrl} width={120} />
      <Stack gap="200" minWidth={0}>
        <Box minWidth={0}>
          <Text fontWeight="600">{piece?.name ?? pieceId}</Text>
          {piece?.colour && (
            <Text fontSize="300" color="neutral.11">
              {piece.colour}
            </Text>
          )}
        </Box>
        <MoneyLines value={piece?.prices} align="flex-start" />
        <Stack gap="0" fontSize="300">
          {lines.map((line) => (
            <Text key={line} fontSize="300">
              {line}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Flex>
  );
}
