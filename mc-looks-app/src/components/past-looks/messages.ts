/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineMessages } from 'react-intl';

// English is the reference language (the default messages); the German texts live in src/i18n/data/de.json.
export default defineMessages({
  title: { id: 'Looks.pastLooks.title', defaultMessage: 'Past looks' },
  description: {
    id: 'Looks.pastLooks.description',
    defaultMessage: 'Looks that were switched off and how they sold',
  },
  empty: {
    id: 'Looks.pastLooks.empty',
    defaultMessage: 'No past looks yet',
  },
  emptyDescription: {
    id: 'Looks.pastLooks.emptyDescription',
    defaultMessage: 'Looks that are switched off appear here with their sales.',
  },
  errorTitle: {
    id: 'Looks.pastLooks.errorTitle',
    defaultMessage: 'The sales figures could not be loaded.',
  },
  errorNote: {
    id: 'Looks.pastLooks.errorNote',
    defaultMessage: 'The looks themselves can still be opened and reactivated.',
  },
  truncated: {
    id: 'Looks.pastLooks.truncated',
    defaultMessage: 'Figures from the last {count} orders',
  },
  best: { id: 'Looks.pastLooks.best', defaultMessage: 'Best look' },
  period: {
    id: 'Looks.pastLooks.period',
    defaultMessage: 'active {from} to {to}',
  },
  sets: { id: 'Looks.pastLooks.sets', defaultMessage: 'Sets sold' },
  orders: { id: 'Looks.pastLooks.orders', defaultMessage: 'Orders' },
  revenue: { id: 'Looks.pastLooks.revenue', defaultMessage: 'Revenue' },
  noSale: { id: 'Looks.pastLooks.noSale', defaultMessage: 'No set sold' },
  reactivate: {
    id: 'Looks.pastLooks.reactivate',
    defaultMessage: 'Reactivate',
  },
  reactivateLabel: {
    id: 'Looks.pastLooks.reactivateLabel',
    defaultMessage: 'Reactivate {name}',
  },
  card: { id: 'Looks.pastLooks.card', defaultMessage: 'Past look {name}' },
});
