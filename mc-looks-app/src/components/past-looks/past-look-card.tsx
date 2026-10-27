import { useState, type KeyboardEvent } from 'react';
import { useIntl } from 'react-intl';
import {
  Badge,
  Box,
  Button,
  Flex,
  Stack,
  Text,
  toast,
} from '@commercetools/nimbus';
import { config } from '../../config';
import type { PastLookRow } from '../../domain/past-looks';
import { lookImageUrl } from '../../domain/look-value';
import { switchLook } from '../../domain/look-writes';
import type { LookDiscount, LookObject } from '../../domain/types';
import { useCanManage, useCurrencies, useLookApi } from '../../hooks/context';
import { describeError } from '../common/describe-error';
import { useLookTitle, useMoney } from '../common/look-hooks';
import { LookPhoto } from '../common/look-photo';
import commonMessages from '../common/messages';
import { PieceImage } from '../common/piece-image';
import messages from './messages';

/** Height of a card's photo or piece strip (px). */
export const PAST_STRIP_HEIGHT = 92;
/** Piece images at most in a strip (a look without photo). */
const PAST_STRIP_PIECES = 3;

function Figure({
  label,
  children,
}: {
  label: string;
  children: string | string[];
}) {
  const lines = Array.isArray(children) ? children : [children];
  return (
    <Stack gap="50" minWidth={0}>
      <Text fontSize="300" color="neutral.11" whiteSpace="nowrap">
        {label}
      </Text>
      {lines.map((line, index) => (
        <Text
          key={index}
          fontWeight={index === 0 ? '600' : undefined}
          fontSize={index === 0 ? '400' : '300'}
          color={index === 0 ? undefined : 'neutral.11'}
          whiteSpace="nowrap"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {line}
        </Text>
      ))}
    </Stack>
  );
}

/** One past look: photo or piece strip, name, period, figures or "Kein Set
 *  verkauft", "Wieder aktivieren". The card opens the look's detail. */
export function PastLookCard({
  past,
  best,
  figures,
  onOpen,
  onDiscountChange,
}: {
  past: PastLookRow;
  best: boolean;
  /** False while the sales read failed: the figures are left out. */
  figures: boolean;
  onOpen: (lookKey: string) => void;
  onDiscountChange: (discount: LookDiscount, object?: LookObject) => void;
}) {
  const intl = useIntl();
  const api = useLookApi();
  const canManage = useCanManage();
  const currencies = useCurrencies();
  const money = useMoney();
  const title = useLookTitle()(past);
  const [busy, setBusy] = useState(false);

  const day = (iso?: string) =>
    iso
      ? intl.formatDate(iso, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : undefined;
  const from = day(past.activeFrom);
  const to = day(past.activeUntil);
  const photoUrl = past.image
    ? lookImageUrl(past.image.path, config.shopOrigin)
    : undefined;
  const revenueLines = [
    ...currencies,
    ...Object.keys(past.revenue).filter((code) => !currencies.includes(code)),
  ]
    .filter((code) => (past.revenue[code] ?? 0) > 0)
    .map((code) => money(past.revenue[code], code));

  async function reactivate() {
    setBusy(true);
    try {
      const current = await api.getCartDiscount(past.discountId);
      const result = await switchLook(api, current, true, {
        objectKey: past.objectKey,
      });
      onDiscountChange(result.discount, result.object);
      toast[result.outcome === 'conflict' ? 'warning' : 'success']({
        title: intl.formatMessage(
          result.outcome === 'conflict'
            ? commonMessages.switchConflict
            : commonMessages.switchedOn,
          { name: title }
        ),
      });
    } catch (error) {
      toast.error({ title: describeError(intl, error) });
    } finally {
      setBusy(false);
    }
  }

  const open = () => onOpen(past.lookKey);
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.target === event.currentTarget &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      open();
    }
  };

  return (
    <Stack
      data-custom-composition="past-look-card"
      data-testid="past-look-card"
      role="listitem"
      aria-label={intl.formatMessage(messages.card, { name: title })}
      tabIndex={0}
      onClick={open}
      onKeyDown={onKeyDown}
      gap="300"
      p="400"
      minWidth={0}
      borderWidth="1px"
      borderColor="neutral.6"
      borderRadius="300"
      bg="neutral.1"
      cursor="pointer"
    >
      <Flex
        data-testid="past-look-strip"
        gap="200"
        height={`${PAST_STRIP_HEIGHT}px`}
        alignItems="flex-start"
      >
        <Flex gap="100" flex="1" minWidth={0} overflow="hidden">
          {photoUrl && past.image ? (
            <LookPhoto
              src={photoUrl}
              alt={title}
              width={(PAST_STRIP_HEIGHT * 2) / 3}
              ratio={{ width: 2, height: 3 }}
            />
          ) : (
            past.pieceImageUrls
              .slice(0, PAST_STRIP_PIECES)
              .map((src, i) => (
                <PieceImage
                  key={i}
                  src={src}
                  width={(PAST_STRIP_HEIGHT * 4) / 5}
                />
              ))
          )}
        </Flex>
        {best && (
          <Box flexShrink={0}>
            <Badge size="xs" colorPalette="neutral">
              {intl.formatMessage(messages.best)}
            </Badge>
          </Box>
        )}
      </Flex>
      <Stack gap="100" minWidth={0}>
        <Text fontWeight="600" fontSize="400" truncate title={title}>
          {title}
        </Text>
        {from && to && (
          <Text fontSize="300" color="neutral.11">
            {intl.formatMessage(messages.period, { from, to })}
          </Text>
        )}
      </Stack>
      {figures &&
        (past.setsSold > 0 ? (
          <Flex
            justifyContent="space-between"
            gap="200"
            data-testid="past-look-figures"
          >
            <Figure label={intl.formatMessage(messages.sets)}>
              {String(past.setsSold)}
            </Figure>
            <Figure label={intl.formatMessage(messages.orders)}>
              {String(past.orders)}
            </Figure>
            <Figure label={intl.formatMessage(messages.revenue)}>
              {revenueLines}
            </Figure>
          </Flex>
        ) : (
          <Text color="neutral.11">{intl.formatMessage(messages.noSale)}</Text>
        ))}
      <Box
        mt="auto"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Button
          size="sm"
          variant="outline"
          width="100%"
          isDisabled={busy || !canManage}
          aria-label={intl.formatMessage(messages.reactivateLabel, {
            name: title,
          })}
          onPress={() => void reactivate()}
        >
          {intl.formatMessage(messages.reactivate)}
        </Button>
      </Box>
    </Stack>
  );
}
