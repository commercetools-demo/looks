import { useMcQuery } from '@commercetools-frontend/application-shell-connectors';
import { mcApiContext } from '../shared/mc-api-context';
import FetchProjectCurrenciesQuery from './fetch-project-currencies.graphql';

/** The project's currencies, in the order of the project settings (FR-007). */
export const useProjectCurrencies = () => {
  const { data, loading, error, refetch } = useMcQuery<{
    project?: { currencies?: string[] } | null;
  }>(FetchProjectCurrenciesQuery, { context: mcApiContext });
  return {
    currencies: data?.project?.currencies ?? [],
    loading,
    error,
    refetch,
  };
};
