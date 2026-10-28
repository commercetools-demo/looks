import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Box,
  Button,
  DefaultPage,
  Flex,
  Grid,
  Heading,
  Link,
  Skeleton,
  Stack,
  Text,
} from '@commercetools/nimbus';
import { config } from '../../config';
import type { LookRow } from '../../domain/look-rows';
import { useCanManage } from '../../hooks/context';
import { useLookDetail } from '../../hooks/use-look-detail';
import { describeError } from '../common/describe-error';
import { useLookTitle } from '../common/look-hooks';
import { LookStatusSwitch } from '../common/look-status';
import commonMessages from '../common/messages';
import { PieceImage } from '../common/piece-image';
import { ShopPreview } from '../shop-preview/shop-preview';
import { CompleteLookPanel } from './complete-look-panel';
import { DeleteLookPanel } from './delete-look-panel';
import messages from './messages';
import { PieceCard } from './piece-card';
import { SetPriceForm } from './set-price-form';

type LookDetailBodyProps = {
  row: LookRow;
  apply: ReturnType<typeof useLookDetail>['apply'];
  reload: () => void;
  onDeleted: () => void;
};

const LookDetailBody: FC<LookDetailBodyProps> = ({
  row,
  apply,
  reload,
  onDeleted,
}) => {
  const intl = useIntl();
  const complete = row.completeness === 'complete';

  return (
    <Stack gap="600">
      {!complete && <CompleteLookPanel row={row} onCompleted={reload} />}
      {row.pieces.flatMap((piece) =>
        piece?.soldOutEverywhere
          ? [
              <Alert.Root key={piece.id} colorPalette="warning">
                <Alert.Title>
                  {intl.formatMessage(messages.soldOutAlertTitle, {
                    piece: piece.name,
                  })}
                </Alert.Title>
                <Alert.Description>
                  {intl.formatMessage(messages.soldOutAlertDescription)}
                </Alert.Description>
              </Alert.Root>,
            ]
          : []
      )}
      {row.missingCurrency && (
        <Alert.Root colorPalette="warning">
          <Alert.Title>
            {intl.formatMessage(messages.missingCurrencyTitle)}
          </Alert.Title>
          <Alert.Description>
            {intl.formatMessage(messages.missingCurrencyDescription)}
          </Alert.Description>
        </Alert.Root>
      )}
      <Grid
        templateColumns={{ base: '1fr', xl: '280px minmax(0, 1fr) 400px' }}
        gap="800"
        alignItems="start"
      >
        <Box>
          <Flex
            width="280px"
            direction="column"
            justifyContent="center"
            gap="100"
            px="800"
            bg="neutral.3"
            overflow="hidden"
            style={{ aspectRatio: '2 / 3' }}
          >
            {row.pieces.slice(0, 2).map((piece, index) => (
              <PieceImage key={row.pieceIds[index]} src={piece?.imageUrl} />
            ))}
          </Flex>
        </Box>
        <Stack gap="300" minWidth={0}>
          <Heading as="h2" size="md">
            {intl.formatMessage(messages.piecesTitle, {
              count: row.pieceIds.length,
            })}
          </Heading>
          {row.pieceIds.map((id, index) => (
            <PieceCard key={id} pieceId={id} piece={row.pieces[index]} />
          ))}
        </Stack>
        <Box
          minWidth={0}
          aria-label={intl.formatMessage(messages.previewTitle)}
        >
          <ShopPreview
            pieces={row.pieces}
            setPrice={row.referenceSetPrice}
            sum={row.referenceSum}
          />
        </Box>
      </Grid>
      {complete && (
        <SetPriceForm
          key={row.object?.version}
          row={row}
          apply={apply}
          reload={reload}
        />
      )}
      <DeleteLookPanel row={row} onDeleted={onDeleted} reload={reload} />
    </Stack>
  );
};

type LookDetailPageProps = {
  basePath: string;
};

/** Detail of one look at `${basePath}/:lookKey`. */
const LookDetailPage: FC<LookDetailPageProps> = ({ basePath }) => {
  const intl = useIntl();
  const canManage = useCanManage();
  const title = useLookTitle();
  const { lookKey } = useParams<{ lookKey: string }>();
  // The list passes its query (page, size, sort, search) so going back restores it.
  const listSearch =
    useLocation<{ listSearch?: string } | undefined>().state?.listSearch ?? '';
  const history = useHistory();
  const { state, reload, apply } = useLookDetail(lookKey);
  const row = state.status === 'ready' ? state.row : undefined;
  const firstPiece = row?.pieces[0];

  return (
    <DefaultPage.Root>
      <DefaultPage.Header>
        <DefaultPage.BackLink href={`${basePath}${listSearch}`}>
          {intl.formatMessage(messages.backToList)}
        </DefaultPage.BackLink>
        <DefaultPage.Title>
          {row
            ? title(row)
            : intl.formatMessage(
                state.status === 'not-found'
                  ? messages.notFoundTitle
                  : commonMessages.appTitle
              )}
        </DefaultPage.Title>
        <DefaultPage.Subtitle>{lookKey}</DefaultPage.Subtitle>
        {row && (
          <DefaultPage.Actions>
            {config.shopOrigin ? (
              <Link
                href={`${config.shopOrigin}/`}
                target="_blank"
                rel="noopener noreferrer"
                title={
                  firstPiece
                    ? intl.formatMessage(messages.viewInShopTitle, {
                        piece: firstPiece.name,
                      })
                    : undefined
                }
              >
                {intl.formatMessage(messages.viewInShop)}
              </Link>
            ) : (
              <Flex alignItems="center" gap="200">
                <Button size="xs" variant="outline" isDisabled>
                  {intl.formatMessage(messages.viewInShop)}
                </Button>
                <Text fontSize="300" color="neutral.11">
                  {intl.formatMessage(messages.shopUnavailable)}
                </Text>
              </Flex>
            )}
            {row.completeness === 'complete' && (
              <Flex alignItems="center" gap="200">
                <Text>{intl.formatMessage(messages.activeSwitchLabel)}</Text>
                <LookStatusSwitch row={row} onChange={apply} />
              </Flex>
            )}
            {!canManage && (
              <Badge colorPalette="neutral">
                {intl.formatMessage(commonMessages.viewOnly)}
              </Badge>
            )}
          </DefaultPage.Actions>
        )}
      </DefaultPage.Header>
      <DefaultPage.Content>
        {state.status === 'loading' && (
          <Skeleton
            height="240px"
            aria-label={intl.formatMessage(commonMessages.loading)}
          />
        )}
        {state.status === 'error' && (
          <Alert.Root colorPalette="critical">
            <Alert.Title>
              {intl.formatMessage(messages.loadErrorTitle)}
            </Alert.Title>
            <Alert.Description>
              {describeError(intl, state.error)}
            </Alert.Description>
            <Alert.Actions>
              <Button size="xs" variant="outline" onPress={reload}>
                {intl.formatMessage(commonMessages.retry)}
              </Button>
            </Alert.Actions>
          </Alert.Root>
        )}
        {state.status === 'not-found' && (
          <Text>
            {intl.formatMessage(messages.notFoundDescription, { key: lookKey })}
          </Text>
        )}
        {row && (
          <LookDetailBody
            row={row}
            apply={apply}
            reload={reload}
            onDeleted={() => history.push(`${basePath}${listSearch}`)}
          />
        )}
      </DefaultPage.Content>
    </DefaultPage.Root>
  );
};

export default LookDetailPage;
