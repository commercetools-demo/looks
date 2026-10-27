import { useIntl } from 'react-intl';
import { Box, Button, Flex, Image, Stack, Text } from '@commercetools/nimbus';
import { formatMoney } from '../../domain/format';
import type { Piece } from '../../domain/types';
import { useCurrencies } from '../../hooks/context';
import messages from './messages';
import { buildPreview, type PreviewRow } from './preview-model';
import { SHOP_LOCALE, shopTexts } from './shop-texts';

/** The neutral shop preview of a look. `setPrice` and `sum` are cent amounts
 *  per project currency; the card shows the first project currency. */
export interface ShopPreviewProps {
  pieces: Array<Piece | undefined>;
  setPrice?: Record<string, number>;
  /** Live sum of the pieces; computed from `pieces` when omitted. */
  sum?: Record<string, number>;
  photoUrl?: string;
  photoRatio?: { width: number; height: number };
  /** Alt text of the look photo; the photo is decorative without it. */
  photoAlt?: string;
}

export function ShopPreview(props: ShopPreviewProps) {
  const intl = useIntl();
  const [currency = ''] = useCurrencies();

  if (!props.pieces.some((piece) => piece !== undefined)) {
    return (
      <Flex
        data-testid="shop-preview-placeholder"
        alignItems="center"
        justifyContent="center"
        minHeight="240px"
        borderWidth="1px"
        borderStyle="dashed"
        borderColor="neutral.6"
        borderRadius="200"
        p="400"
      >
        <Text color="neutral.11" textAlign="center" maxWidth="260px">
          {intl.formatMessage(messages.placeholder)}
        </Text>
      </Flex>
    );
  }

  const model = buildPreview({ ...props, currency });
  const money = (cents: number) => formatMoney(cents, currency, SHOP_LOCALE);

  return (
    <Box
      role="region"
      aria-label={intl.formatMessage(messages.region)}
      data-testid="shop-preview"
      borderWidth="1px"
      borderColor="neutral.6"
      borderRadius="200"
      overflow="hidden"
      bg="neutral.1"
    >
      {props.photoUrl && (
        <Box
          data-testid="preview-photo"
          position="relative"
          overflow="hidden"
          bg="neutral.3"
          style={{ aspectRatio: '2 / 3' }}
        >
          <Image
            src={props.photoUrl}
            alt={props.photoAlt ?? ''}
            position="absolute"
            inset="0"
            width="100%"
            height="100%"
            objectFit="cover"
          />
        </Box>
      )}
      <Stack gap="400" p="400">
        <Flex
          wrap="wrap"
          alignItems="baseline"
          justifyContent="space-between"
          gap="200"
        >
          <Text fontWeight="600" fontSize="500">
            {model.setPrice === undefined
              ? shopTexts.setPending
              : shopTexts.setPrice(money(model.setPrice))}
          </Text>
          {model.sum !== undefined && (
            <Text fontSize="350" color="neutral.11">
              {shopTexts.sumLabel}:{' '}
              <Text as="span" textDecoration="line-through">
                {money(model.sum)}
              </Text>
            </Text>
          )}
        </Flex>
        {model.saving !== undefined && (
          <Text fontSize="350" color="positive.11">
            {shopTexts.saving(money(model.saving))}
          </Text>
        )}
        <Stack gap="300">
          {model.rows.map((row) => (
            <PieceLine key={row.id} row={row} money={money} />
          ))}
        </Stack>
        <Button
          variant="solid"
          colorPalette="primary"
          width="100%"
          onPress={() => undefined}
        >
          {shopTexts.addSet}
        </Button>
      </Stack>
    </Box>
  );
}

function SizeLookAlike({ row }: { row: PreviewRow }) {
  const label = row.oneSize ? shopTexts.oneSize : row.sizeLabel;
  const note =
    row.sizeState === 'sold-out'
      ? shopTexts.soldOut
      : row.sizeState === 'low'
      ? shopTexts.lowStock(row.quantity)
      : undefined;
  return (
    <Flex
      data-testid="preview-size"
      alignItems="center"
      gap="150"
      borderWidth="1px"
      borderColor="neutral.7"
      borderRadius="100"
      px="200"
      py="100"
      fontSize="350"
      flexShrink={0}
    >
      {row.sizeState !== 'sold-out' && <span>{label}</span>}
      {note && (
        <Text
          as="span"
          fontSize="300"
          color={row.sizeState === 'sold-out' ? 'critical.11' : 'warning.11'}
        >
          {note}
        </Text>
      )}
      {!row.oneSize && row.sizeState !== 'sold-out' && (
        <span aria-hidden="true">▾</span>
      )}
    </Flex>
  );
}

function PieceLine({
  row,
  money,
}: {
  row: PreviewRow;
  money: (cents: number) => string;
}) {
  return (
    <Flex alignItems="center" gap="300" data-testid="preview-row">
      <Box
        width="48px"
        flexShrink={0}
        position="relative"
        overflow="hidden"
        bg="neutral.3"
        style={{ aspectRatio: '4 / 5' }}
      >
        {row.imageUrl && (
          <Image
            src={row.imageUrl}
            alt=""
            position="absolute"
            inset="0"
            width="100%"
            height="100%"
            objectFit="cover"
          />
        )}
      </Box>
      <Stack gap="0" flex="1" minWidth={0}>
        <Text
          fontSize="350"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {row.name}
        </Text>
        {row.price !== undefined && (
          <Text fontSize="300" color="neutral.11">
            {money(row.price)}
          </Text>
        )}
      </Stack>
      <SizeLookAlike row={row} />
    </Flex>
  );
}
