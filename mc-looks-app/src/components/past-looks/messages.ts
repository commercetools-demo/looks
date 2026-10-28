/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineMessages } from 'react-intl';

// German is the reference language; English lives in messages.en.json.
export default defineMessages({
  title: { id: 'Looks.pastLooks.title', defaultMessage: 'Frühere Looks' },
  description: {
    id: 'Looks.pastLooks.description',
    defaultMessage: 'Ausgeschaltete Looks und wie sie verkauft haben',
  },
  empty: {
    id: 'Looks.pastLooks.empty',
    defaultMessage: 'Noch keine früheren Looks',
  },
  emptyDescription: {
    id: 'Looks.pastLooks.emptyDescription',
    defaultMessage: 'Ausgeschaltete Looks erscheinen hier mit ihren Verkäufen.',
  },
  errorTitle: {
    id: 'Looks.pastLooks.errorTitle',
    defaultMessage: 'Die Verkaufszahlen konnten nicht geladen werden.',
  },
  errorNote: {
    id: 'Looks.pastLooks.errorNote',
    defaultMessage:
      'Die Looks selbst lassen sich weiter öffnen und wieder aktivieren.',
  },
  truncated: {
    id: 'Looks.pastLooks.truncated',
    defaultMessage: 'Zahlen aus den letzten {count} Bestellungen',
  },
  best: { id: 'Looks.pastLooks.best', defaultMessage: 'Bester Look' },
  period: {
    id: 'Looks.pastLooks.period',
    defaultMessage: 'aktiv {from} bis {to}',
  },
  sets: { id: 'Looks.pastLooks.sets', defaultMessage: 'Verkaufte Sets' },
  orders: { id: 'Looks.pastLooks.orders', defaultMessage: 'Bestellungen' },
  revenue: { id: 'Looks.pastLooks.revenue', defaultMessage: 'Umsatz' },
  noSale: { id: 'Looks.pastLooks.noSale', defaultMessage: 'Kein Set verkauft' },
  reactivate: {
    id: 'Looks.pastLooks.reactivate',
    defaultMessage: 'Wieder aktivieren',
  },
  reactivateLabel: {
    id: 'Looks.pastLooks.reactivateLabel',
    defaultMessage: '{name} wieder aktivieren',
  },
  card: { id: 'Looks.pastLooks.card', defaultMessage: 'Früherer Look {name}' },
});
