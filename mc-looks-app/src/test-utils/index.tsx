import type { ReactElement } from 'react';
import { IntlProvider } from 'react-intl';
import { createApolloClient } from '@commercetools-frontend/application-shell';
import {
  mapResourceAccessToAppliedPermissions,
  renderApp,
  screen,
  type TRenderAppOptions,
} from '@commercetools-frontend/application-shell/test-utils';
import { NimbusProvider } from '@commercetools/nimbus';
import { LooksRoutes } from '../components/looks-app';
import { PERMISSIONS, entryPointUriPath } from '../constants';
import type { LookApi } from '../domain/look-api';
import { LookProvider } from '../hooks/context';
import de from '../i18n/data/de.json';
import en from '../i18n/data/en.json';
import { CURRENCIES } from './fixtures';

export const PROJECT_KEY = 'looks-test';
export const APP_ROOT = `/${PROJECT_KEY}/${entryPointUriPath}`;

export interface RenderLooksOptions {
  api: LookApi;
  /** Path below the app root, for example `/new` or `/cozy-in-grey`. */
  path?: string;
  /** Manage permission (View is always granted). Defaults to true. */
  canManage?: boolean;
  currencies?: string[];
  /** UI language (labels, buttons). */
  locale?: string;
  /** Merchant Center data locale (look and product names). Defaults to `locale`. */
  dataLocale?: string;
}

const renderApplication = (
  ui: ReactElement,
  options: Partial<TRenderAppOptions>
) =>
  renderApp(ui, {
    ...options,
    environment: { ...(options.environment || {}), entryPointUriPath },
    apolloClient: createApolloClient(),
  });

/** Renders the app routes in the Merchant Center test shell with an injected
 *  `LookApi` and the given permissions. */
export function renderLooks(options: RenderLooksOptions) {
  const permissions = [
    PERMISSIONS.View,
    ...(options.canManage === false ? [] : [PERMISSIONS.Manage]),
  ];
  const locale = options.locale ?? 'de';
  const dataLocale = options.dataLocale ?? locale;
  return renderApplication(
    <IntlProvider locale={locale} messages={locale.startsWith('de') ? de : en}>
      <NimbusProvider locale={locale} loadFonts={false}>
        <LookProvider
          api={options.api}
          currencies={options.currencies ?? CURRENCIES}
        >
          <LooksRoutes />
        </LookProvider>
      </NimbusProvider>
    </IntlProvider>,
    {
      route: `${APP_ROOT}${options.path ?? ''}`,
      locale,
      dataLocale,
      project: {
        key: PROJECT_KEY,
        allAppliedPermissions:
          mapResourceAccessToAppliedPermissions(permissions),
      },
      user: { language: locale },
    }
  );
}

export { screen };
