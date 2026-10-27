import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useApolloClient } from '@apollo/client';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { useIsAuthorized } from '@commercetools-frontend/permissions';
import { config } from '../config';
import { PERMISSIONS } from '../constants';
import type { LookApi } from '../domain/look-api';
import { createLookApi } from './use-looks-connector/look-api';

interface LookContextValue {
  api: LookApi;
  currencies: string[];
  dataLocale: string;
}

const LookContext = createContext<LookContextValue | null>(null);

export function LookProvider({
  currencies,
  children,
  api,
}: {
  currencies: string[];
  children: ReactNode;
  /** Tests inject a fake. */
  api?: LookApi;
}) {
  const client = useApolloClient();
  const dataLocale = useApplicationContext(
    (context) => context.dataLocale ?? 'de'
  );
  const value = useMemo<LookContextValue>(
    () => ({
      api: api ?? createLookApi(client, { currencies, dataLocale, config }),
      currencies,
      dataLocale,
    }),
    [api, client, currencies, dataLocale]
  );
  return <LookContext.Provider value={value}>{children}</LookContext.Provider>;
}

function useLookContext(): LookContextValue {
  const value = useContext(LookContext);
  if (!value) throw new Error('useLookContext() needs a <LookProvider>.');
  return value;
}

export const useLookApi = (): LookApi => useLookContext().api;
export const useCurrencies = (): string[] => useLookContext().currencies;
export const useDataLocale = (): string => useLookContext().dataLocale;

/** Manage permission: every write control is disabled without it (never hidden). */
export const useCanManage = (): boolean =>
  useIsAuthorized({ demandedPermissions: [PERMISSIONS.Manage] });
