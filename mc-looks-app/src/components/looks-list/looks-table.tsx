import { useRef, type ReactNode } from 'react';
import { useIntl } from 'react-intl';
import './looks-table.css';
import {
  Box,
  Button,
  DataTable,
  Flex,
  Skeleton,
  Stack,
  Text,
  VisuallyHidden,
  type DataTableColumnItem,
  type DataTableRowItem,
} from '@commercetools/nimbus';
import { config } from '../../config';
import type { LookRow } from '../../domain/look-rows';
import type { SortKey, SortState } from '../../domain/sorting';
import { lookImageUrl } from '../../domain/look-value';
import type { LookDiscount, LookObject } from '../../domain/types';
import { useCanManage } from '../../hooks/context';
import { useLookTitle } from '../common/look-hooks';
import { LookPhoto } from '../common/look-photo';
import { LookStatusBadges, LookStatusSwitch } from '../common/look-status';
import { MoneyLines } from '../common/money-lines';
import commonMessages from '../common/messages';
import { PieceImage } from '../common/piece-image';
import messages from './messages';

type Row = DataTableRowItem<{ look: LookRow; position: number }>;

/** One piece image in the Teile column and the gap between two (px). */
export const STRIP_IMAGE_WIDTH = 36;
export const STRIP_GAP = 4;
/** The look photo in the Look column: 64 px wide, 2:3 portrait. */
export const LOOK_PHOTO_WIDTH = 64;
export const LOOK_PHOTO_RATIO = { width: 2, height: 3 };
/** Piece images stacked in the photo box of a look without photo. */
const PHOTO_BOX_FALLBACK_PIECES = 2;

/**
 * Column widths in px. The Look column has no width: it takes the rest of
 * the full-width table and never narrows below `lookMin`. Each fixed column
 * sets `minWidth` too, because Nimbus applies a default minimum to every
 * column that does not name one. Headers never wrap (looks-table.css), so
 * every fixed column is at least as wide as its header in German and
 * English (sort icon and cell padding included).
 */
export const LOOK_TABLE_COLUMN_WIDTHS = {
  lookMin: 200,
  pieces: 5 * STRIP_IMAGE_WIDTH + 4 * STRIP_GAP + 24,
  setPrice: 130,
  sum: 130,
  saving: 120,
  status: 130,
  active: 88,
} as const;

const SORT_DIRECTION = { asc: 'ascending', desc: 'descending' } as const;

function LookCell({ look }: { look: LookRow }) {
  const title = useLookTitle()(look);
  const photoUrl = look.image
    ? lookImageUrl(look.image.path, config.shopOrigin)
    : undefined;
  return (
    <Flex
      data-custom-composition="look-cell"
      gap="350"
      alignItems="center"
      minWidth={0}
      py="100"
    >
      {photoUrl && look.image ? (
        <LookPhoto
          src={photoUrl}
          alt={title}
          width={LOOK_PHOTO_WIDTH}
          ratio={LOOK_PHOTO_RATIO}
        />
      ) : (
        <Flex
          data-photo-fallback=""
          direction="column"
          justifyContent="center"
          gap="1px"
          px="14px"
          bg="neutral.3"
          flexShrink={0}
          width={`${LOOK_PHOTO_WIDTH}px`}
          style={{
            aspectRatio: `${LOOK_PHOTO_RATIO.width} / ${LOOK_PHOTO_RATIO.height}`,
          }}
        >
          {look.pieces.slice(0, PHOTO_BOX_FALLBACK_PIECES).map((piece, i) => (
            <PieceImage
              key={look.pieceIds[i]}
              src={piece?.imageUrl}
              width="100%"
            />
          ))}
        </Flex>
      )}
      <Stack gap="50" minWidth={0}>
        <Text fontWeight="600" truncate title={title}>
          {title}
        </Text>
        <Text fontSize="300" color="neutral.11" truncate title={look.lookKey}>
          {look.lookKey}
        </Text>
      </Stack>
    </Flex>
  );
}

function PieceStrip({ look, loading }: { look: LookRow; loading: boolean }) {
  const intl = useIntl();
  const names = look.pieces
    .map((piece, i) => piece?.name ?? look.pieceIds[i])
    .join(', ');
  return (
    <Flex
      data-custom-composition="piece-strip"
      role="group"
      aria-label={intl.formatMessage(messages.piecesStrip, { names })}
      gap={`${STRIP_GAP}px`}
    >
      {look.pieceIds.map((id, i) =>
        loading && !look.pieces[i] ? (
          <Skeleton
            key={id}
            width={`${STRIP_IMAGE_WIDTH}px`}
            style={{ aspectRatio: '4 / 5' }}
          />
        ) : (
          <PieceImage
            key={id}
            src={look.pieces[i]?.imageUrl}
            width={STRIP_IMAGE_WIDTH}
          />
        )
      )}
    </Flex>
  );
}

/** The price cells wait for the pieces' live prices. */
function PriceCell({
  look,
  loading,
  children,
}: {
  look: LookRow;
  loading: boolean;
  children: ReactNode;
}) {
  const intl = useIntl();
  if (loading && look.pieces.some((piece) => !piece)) {
    return (
      <Skeleton
        height="16px"
        width="70px"
        aria-label={intl.formatMessage(messages.pricesLoading)}
      />
    );
  }
  return <>{children}</>;
}

export function LooksTable({
  rows,
  sort,
  pricesLoading,
  onSortChange,
  onOpen,
  onDiscountChange,
}: {
  rows: LookRow[];
  sort: SortState;
  pricesLoading: boolean;
  onSortChange: (key: SortKey, direction: SortState['direction']) => void;
  onOpen: (lookKey: string) => void;
  onDiscountChange: (discount: LookDiscount, object?: LookObject) => void;
}) {
  const intl = useIntl();
  const canManage = useCanManage();
  const lookTitle = useLookTitle();
  // The DataTable fires its row press from native listeners and ignores only
  // presses on inputs and buttons; a press on the switch's visible track
  // would open the detail as well. A press inside a control marks the next
  // row press as handled.
  const controlPressedAt = useRef(0);
  const markControlPress = () => {
    controlPressedAt.current = Date.now();
  };
  const openRow = (lookKey: string) => {
    if (Date.now() - controlPressedAt.current < 1000) return;
    onOpen(lookKey);
  };
  const widths = LOOK_TABLE_COLUMN_WIDTHS;
  const sized = (width: number) => ({ width, minWidth: width });
  const stopRowPress = {
    onClick: (event: { stopPropagation: () => void }) =>
      event.stopPropagation(),
    onPointerDown: (event: { stopPropagation: () => void }) =>
      event.stopPropagation(),
    onPointerDownCapture: markControlPress,
  };

  // The rows arrive in their final order (all looks, not just this page).
  // The table sorts by the accessor, so a sortable column answers with the
  // row's position, mirrored for descending, and keeps that order.
  const position = (row: Row) =>
    sort.direction === 'asc' ? row.position : -row.position;
  const sortable = { isSortable: true, accessor: position } as const;

  const columns: DataTableColumnItem<Row>[] = [
    {
      id: 'name',
      minWidth: widths.lookMin,
      header: intl.formatMessage(messages.columnLook),
      ...sortable,
      isRowHeader: true,
      render: ({ row }) => <LookCell look={row.look} />,
    },
    {
      id: 'pieces',
      ...sized(widths.pieces),
      header: intl.formatMessage(messages.columnPieces),
      isSortable: false,
      accessor: (row) => row.look.pieceIds.length,
      render: ({ row }) => (
        <PieceStrip look={row.look} loading={pricesLoading} />
      ),
    },
    {
      id: 'setPrice',
      ...sized(widths.setPrice),
      header: intl.formatMessage(messages.columnSetPrice),
      ...sortable,
      align: 'end',
      render: ({ row }) => <MoneyLines value={row.look.setPrice} strong />,
    },
    {
      id: 'sum',
      ...sized(widths.sum),
      header: intl.formatMessage(messages.columnSum),
      ...sortable,
      align: 'end',
      render: ({ row }) => (
        <PriceCell look={row.look} loading={pricesLoading}>
          <MoneyLines value={row.look.liveSum} />
        </PriceCell>
      ),
    },
    {
      id: 'saving',
      ...sized(widths.saving),
      header: intl.formatMessage(messages.columnSaving),
      ...sortable,
      align: 'end',
      render: ({ row }) => (
        <PriceCell look={row.look} loading={pricesLoading}>
          <Text whiteSpace="nowrap">
            {row.look.savingPercent === undefined
              ? intl.formatMessage(commonMessages.noValue)
              : intl.formatMessage(messages.savingValue, {
                  percent: row.look.savingPercent,
                })}
          </Text>
        </PriceCell>
      ),
    },
    {
      id: 'status',
      ...sized(widths.status),
      header: intl.formatMessage(messages.columnStatus),
      ...sortable,
      render: ({ row }) => (
        <Stack gap="100" alignItems="flex-start">
          <LookStatusBadges row={row.look} />
          {row.look.completeness !== 'complete' && (
            <Box {...stopRowPress}>
              <Button
                size="2xs"
                variant="link"
                isDisabled={!canManage}
                aria-label={intl.formatMessage(messages.completeLabel, {
                  name: lookTitle(row.look),
                })}
                onPress={() => onOpen(row.look.lookKey)}
              >
                {intl.formatMessage(messages.complete)}
              </Button>
            </Box>
          )}
        </Stack>
      ),
    },
    {
      id: 'active',
      ...sized(widths.active),
      header: intl.formatMessage(messages.columnActive),
      isSortable: false,
      accessor: (row) => (row.look.isActive ? 1 : 0),
      render: ({ row }) => (
        <Box {...stopRowPress}>
          <LookStatusSwitch row={row.look} onChange={onDiscountChange} />
        </Box>
      ),
    },
  ];

  const sortedColumn = columns.find((column) => column.id === sort.key);

  return (
    <div className="looks-table" data-testid="looks-table">
      <VisuallyHidden>
        <span role="status">
          {intl.formatMessage(messages.sortedBy, {
            column: sortedColumn?.header,
            direction: sort.direction,
          })}
        </span>
      </VisuallyHidden>
      <DataTable
        columns={columns}
        rows={rows.map((look, index) => ({
          id: look.id,
          look,
          position: index,
        }))}
        allowsSorting
        sortDescriptor={{
          column: sort.key,
          direction: SORT_DIRECTION[sort.direction],
        }}
        onSortChange={(descriptor) =>
          onSortChange(
            descriptor.column as SortKey,
            descriptor.direction === 'ascending' ? 'asc' : 'desc'
          )
        }
        allowsPinning={false}
        allowsExpandColumn={false}
        density="condensed"
        onRowClick={(row) => openRow(row.look.lookKey)}
      />
    </div>
  );
}
