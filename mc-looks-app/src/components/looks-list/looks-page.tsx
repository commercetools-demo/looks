import { useIntl } from 'react-intl';
import { useHistory, useLocation } from 'react-router-dom';
import { Add, Visibility } from '@commercetools/nimbus-icons';
import {
  Alert,
  Badge,
  Button,
  DefaultPage,
  Flex,
  Heading,
  Icon,
  Pagination,
  SearchInput,
  Skeleton,
  Stack,
  Text,
} from '@commercetools/nimbus';
import { PAGE_SIZES } from '../../domain/paging';
import { useCanManage } from '../../hooks/context';
import { useLooksOverview } from '../../hooks/use-looks-overview';
import commonMessages from '../common/messages';
import { describeError } from '../common/describe-error';
import { NewLookModal } from '../new-look/new-look-modal';
import { PastLooksSection } from '../past-looks/past-looks-section';
import { LooksTable } from './looks-table';
import messages from './messages';

function NewLookButton({ onPress }: { onPress: () => void }) {
  const intl = useIntl();
  const canManage = useCanManage();
  return (
    <Button
      variant="outline"
      colorPalette="primary"
      isDisabled={!canManage}
      onPress={onPress}
    >
      <Icon>
        <Add />
      </Icon>
      {intl.formatMessage(messages.newLook)}
    </Button>
  );
}

/** No look at all yet: what a look is, and the way to create one. */
function EmptyLooks({ onNewLook }: { onNewLook: () => void }) {
  const intl = useIntl();
  return (
    <Flex
      direction="column"
      alignItems="center"
      gap="400"
      py="1600"
      px="600"
      borderWidth="1px"
      borderColor="neutral.6"
      borderRadius="300"
      textAlign="center"
    >
      <Stack gap="100" maxWidth="420px">
        <Heading as="h2" size="md">
          {intl.formatMessage(messages.emptyTitle)}
        </Heading>
        <Text color="neutral.11">
          {intl.formatMessage(messages.emptyDescription)}
        </Text>
      </Stack>
      <NewLookButton onPress={onNewLook} />
    </Flex>
  );
}

/** Start screen: every look with its set price and live discount status. */
export default function LooksPage({
  basePath,
  showNewLook = false,
}: {
  basePath: string;
  showNewLook?: boolean;
}) {
  const intl = useIntl();
  const history = useHistory();
  const location = useLocation();
  const canManage = useCanManage();
  const overview = useLooksOverview();
  const { state, view, query } = overview;

  const openNew = () =>
    history.push({ pathname: `${basePath}/new`, search: location.search });
  // The list's query travels along so the detail can bring the user back to
  // the same page, sort and search.
  const openLook = (lookKey: string) =>
    history.push({
      pathname: `${basePath}/${lookKey}`,
      state: { listSearch: location.search },
    });

  return (
    <DefaultPage.Root>
      <DefaultPage.Header>
        <DefaultPage.Title>
          {intl.formatMessage(commonMessages.appTitle)}
        </DefaultPage.Title>
        <DefaultPage.Actions>
          {!canManage && (
            <Badge colorPalette="neutral">
              <Icon size="xs">
                <Visibility />
              </Icon>
              {intl.formatMessage(commonMessages.viewOnly)}
            </Badge>
          )}
          <NewLookButton onPress={openNew} />
        </DefaultPage.Actions>
      </DefaultPage.Header>
      <DefaultPage.Content>
        <Stack gap="400">
          <Flex gap="400" alignItems="center" wrap="wrap">
            <SearchInput
              aria-label={intl.formatMessage(messages.searchLabel)}
              placeholder={intl.formatMessage(messages.searchPlaceholder)}
              value={query.q}
              onChange={overview.setSearch}
              width="360px"
              maxWidth="100%"
            />
            {state.status === 'ready' && (
              <Text color="neutral.11" ml="auto" data-testid="looks-count">
                {intl.formatMessage(messages.looksCount, { count: view.total })}
              </Text>
            )}
          </Flex>

          {state.status === 'loading' && (
            <Stack
              gap="100"
              role="status"
              aria-label={intl.formatMessage(commonMessages.loading)}
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height="76px" />
              ))}
            </Stack>
          )}

          {state.status === 'error' && (
            <Alert.Root colorPalette="critical">
              <Alert.Title>
                {intl.formatMessage(messages.loadErrorTitle)}
              </Alert.Title>
              <Alert.Description>
                {describeError(intl, state.error)}{' '}
                {intl.formatMessage(messages.loadErrorNote)}
              </Alert.Description>
              <Alert.Actions>
                <Button size="xs" variant="outline" onPress={overview.reload}>
                  {intl.formatMessage(commonMessages.retry)}
                </Button>
              </Alert.Actions>
            </Alert.Root>
          )}

          {state.status === 'ready' &&
            (state.rows.length === 0 ? (
              <EmptyLooks onNewLook={openNew} />
            ) : view.total === 0 ? (
              <Text color="neutral.11" textAlign="center" py="800">
                {intl.formatMessage(
                  view.filtered ? messages.emptyFiltered : messages.noActive
                )}
              </Text>
            ) : (
              <>
                <LooksTable
                  rows={view.rows}
                  sort={query.sort}
                  pricesLoading={overview.pricesLoading}
                  onSortChange={overview.setSort}
                  onOpen={openLook}
                  onDiscountChange={overview.replaceDiscount}
                />
                <Pagination
                  aria-label={intl.formatMessage(messages.pagination)}
                  totalItems={view.total}
                  currentPage={view.page}
                  pageSize={query.size}
                  pageSizeOptions={[...PAGE_SIZES]}
                  enablePageSizeSelector
                  onPageChange={overview.setPage}
                  onPageSizeChange={overview.setPageSize}
                />
              </>
            ))}

          {state.status === 'ready' && (
            <PastLooksSection
              rows={state.rows}
              onOpen={openLook}
              onDiscountChange={overview.replaceDiscount}
            />
          )}
        </Stack>
      </DefaultPage.Content>
      {showNewLook && (
        <NewLookModal basePath={basePath} onSaved={overview.reload} />
      )}
    </DefaultPage.Root>
  );
}
