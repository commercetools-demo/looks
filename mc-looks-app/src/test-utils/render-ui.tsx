import type { ReactElement } from 'react';
import { IntlProvider } from 'react-intl';
import { createApolloClient } from '@commercetools-frontend/application-shell';
import {
  mapResourceAccessToAppliedPermissions,
  renderApp,
} from '@commercetools-frontend/application-shell/test-utils';
import { NimbusProvider } from '@commercetools/nimbus';
import { PERMISSIONS, entryPointUriPath } from '../constants';
import { LookProvider } from '../hooks/context';
import de from '../i18n/data/de.json';
import en from '../i18n/data/en.json';
import { createFakeLookApi } from './fake-look-api';
import { CURRENCIES, LANGUAGES } from './fixtures';
import { PROJECT_KEY } from './index';

/** Renders a single component with the app's providers (intl, Nimbus, a
 *  `LookProvider` over a fake API), for component specs that need no routes. */
export function renderUi(
  ui: ReactElement,
  options: {
    locale?: string;
    currencies?: string[];
    languages?: string[];
    canManage?: boolean;
  } = {}
) {
  const locale = options.locale ?? 'de';
  const permissions = [
    PERMISSIONS.View,
    ...(options.canManage === false ? [] : [PERMISSIONS.Manage]),
  ];
  return renderApp(
    <IntlProvider locale={locale} messages={locale.startsWith('de') ? de : en}>
      <NimbusProvider locale={locale} loadFonts={false}>
        <LookProvider
          api={createFakeLookApi().api}
          currencies={options.currencies ?? CURRENCIES}
          languages={options.languages ?? LANGUAGES}
        >
          {ui}
        </LookProvider>
      </NimbusProvider>
    </IntlProvider>,
    {
      locale,
      dataLocale: locale,
      environment: { entryPointUriPath },
      apolloClient: createApolloClient(),
      project: {
        key: PROJECT_KEY,
        allAppliedPermissions:
          mapResourceAccessToAppliedPermissions(permissions),
      },
      user: { language: locale },
    }
  );
}
