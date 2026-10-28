import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { Alert, Button, LoadingSpinner, Stack } from '@commercetools/nimbus';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import { LookProvider } from '../hooks/context';
import { useProjectSettings } from '../hooks/use-project-settings';
import messages from './common/messages';
import LookDetailPage from './look-detail/look-detail-page';
import LooksPage from './looks-list/looks-page';

/** Routes of the app, below the project's currencies being known. */
export const LooksRoutes: FC = () => {
  const { path, url } = useRouteMatch();
  return (
    <Switch>
      <Route exact path={path}>
        <LooksPage basePath={url} />
      </Route>
      <Route exact path={`${path}/new`}>
        <LooksPage basePath={url} showNewLook />
      </Route>
      <Route path={`${path}/:lookKey`}>
        <LookDetailPage basePath={url} />
      </Route>
    </Switch>
  );
};

/** Loads the project's currencies once, then renders the routes. */
export const LooksApp: FC = () => {
  const intl = useIntl();
  const { currencies, languages, loading, error, refetch } =
    useProjectSettings();

  if (loading) {
    return (
      <Stack
        alignItems="center"
        py="1600"
        role="status"
        aria-label={intl.formatMessage(messages.loading)}
      >
        <LoadingSpinner />
      </Stack>
    );
  }
  if (error || currencies.length === 0 || languages.length === 0) {
    return (
      <Alert.Root colorPalette="critical" m="600">
        <Alert.Title>
          {intl.formatMessage(
            error
              ? messages.settingsLoadError
              : currencies.length === 0
              ? messages.currenciesMissing
              : messages.languagesMissing
          )}
        </Alert.Title>
        <Alert.Actions>
          <Button size="xs" variant="outline" onPress={() => void refetch()}>
            {intl.formatMessage(messages.retry)}
          </Button>
        </Alert.Actions>
      </Alert.Root>
    );
  }
  return (
    <LookProvider currencies={currencies} languages={languages}>
      <LooksRoutes />
    </LookProvider>
  );
};
