/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useMcQuery } from '@commercetools-frontend/application-shell-connectors';
import { mcApiContext } from '../shared/mc-api-context';
import FetchProjectSettingsQuery from './fetch-project-settings.graphql';

/**
 * The project's currencies and languages, in the order of the project
 * settings. Currencies drive every price (FR-007); languages drive the
 * look name inputs.
 */
export const useProjectSettings = () => {
  const { data, loading, error, refetch } = useMcQuery<{
    project?: { currencies?: string[]; languages?: string[] } | null;
  }>(FetchProjectSettingsQuery, { context: mcApiContext });
  return {
    currencies: data?.project?.currencies ?? [],
    languages: data?.project?.languages ?? [],
    loading,
    error,
    refetch,
  };
};
