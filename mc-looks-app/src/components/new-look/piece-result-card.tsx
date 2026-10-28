/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { Add, Check } from '@commercetools/nimbus-icons';
import {
  Box,
  Button,
  Card,
  Flex,
  Icon,
  Stack,
  Text,
} from '@commercetools/nimbus';
import { stockStateOf } from '../../domain/stock';
import type { Piece } from '../../domain/types';
import commonMessages from '../common/messages';
import { PieceImage } from '../common/piece-image';
import messages from './messages';

/** `static`: the tile only shows the piece (the look detail), no action. */
export type CardState = 'available' | 'in-look' | 'static';

type PieceResultCardProps = {
  piece: Piece;
  state: CardState;
  isDisabled?: boolean;
  onAdd?: () => void;
};

/** One product tile: image, name, size chips with "nur noch N" and
 *  "ausverkauft", and the add action (not in the `static` state). */
export const PieceResultCard: FC<PieceResultCardProps> = (props) => {
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
    // The image runs to the card's edge, so the card has no padding of its own.
    <Card.Root
      minWidth={0}
      width="100%"
      height="100%"
      overflow="hidden"
      p="0"
      gap="0"
      display="flex"
      flexDirection="column"
    >
      <PieceImage src={piece.imageUrl} />
      <Card.Body
        p="0"
        flex="1"
        minWidth={0}
        display="flex"
        flexDirection="column"
      >
        <Stack gap="200" p="250" flex="1" minWidth={0}>
          <Box minWidth={0}>
            <Text fontWeight="500" truncate title={piece.name}>
              {piece.name}
            </Text>
          </Box>
          {piece.oneSize ? (
            <Text fontSize="300">
              {intl.formatMessage(commonMessages.oneSize)}
            </Text>
          ) : (
            <Flex wrap="wrap" gap="100">
              {piece.sizes.map((size) => {
                const sold =
                  stockStateOf(size.availableQuantity) === 'sold-out';
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
          <Stack gap="0">
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
          {props.state === 'static' ? null : props.state === 'in-look' ? (
            <Flex
              alignItems="center"
              justifyContent="center"
              gap="100"
              height="32px"
              color="positive.11"
              fontWeight="500"
            >
              <Icon size="2xs">
                <Check />
              </Icon>
              {intl.formatMessage(messages.inLook)}
            </Flex>
          ) : (
            <Button
              size="xs"
              variant="outline"
              aria-label={`${intl.formatMessage(messages.add)}: ${piece.name}`}
              isDisabled={props.isDisabled}
              onPress={props.onAdd}
            >
              <Icon size="2xs">
                <Add />
              </Icon>
              {intl.formatMessage(messages.add)}
            </Button>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
};
