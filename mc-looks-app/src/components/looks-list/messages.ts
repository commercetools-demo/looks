/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineMessages } from 'react-intl';

// English is the reference language (the default messages); the German texts live in src/i18n/data/de.json.
export default defineMessages({
  newLook: { id: 'Looks.list.newLook', defaultMessage: 'New look' },
  searchLabel: {
    id: 'Looks.list.searchLabel',
    defaultMessage: 'Search looks',
  },
  searchPlaceholder: {
    id: 'Looks.list.searchPlaceholder',
    defaultMessage: 'Search by name',
  },
  looksCount: {
    id: 'Looks.list.looksCount',
    defaultMessage: '{count, plural, one {# look} other {# looks}}',
  },
  columnLook: { id: 'Looks.list.columnLook', defaultMessage: 'Look' },
  columnPieces: { id: 'Looks.list.columnPieces', defaultMessage: 'Pieces' },
  columnSetPrice: {
    id: 'Looks.list.columnSetPrice',
    defaultMessage: 'Set price',
  },
  columnSum: { id: 'Looks.list.columnSum', defaultMessage: 'Total' },
  columnSaving: { id: 'Looks.list.columnSaving', defaultMessage: 'Saving' },
  columnStatus: { id: 'Looks.list.columnStatus', defaultMessage: 'Status' },
  columnActive: { id: 'Looks.list.columnActive', defaultMessage: 'Active' },
  savingValue: { id: 'Looks.list.savingValue', defaultMessage: '{percent}%' },
  piecesMore: {
    id: 'Looks.list.piecesMore',
    defaultMessage: '+{count}',
  },
  piecesStrip: {
    id: 'Looks.list.piecesStrip',
    defaultMessage: 'Pieces: {names}',
  },
  complete: { id: 'Looks.list.complete', defaultMessage: 'Complete' },
  completeLabel: {
    id: 'Looks.list.completeLabel',
    defaultMessage: 'Complete {name}',
  },
  sortedBy: {
    id: 'Looks.list.sortedBy',
    defaultMessage:
      'Sorted by {column}, {direction, select, asc {ascending} other {descending}}',
  },
  pricesLoading: {
    id: 'Looks.list.pricesLoading',
    defaultMessage: 'Loading prices',
  },
  pagination: {
    id: 'Looks.list.pagination',
    defaultMessage: 'Pages of looks',
  },
  emptyTitle: {
    id: 'Looks.list.emptyTitle',
    defaultMessage: 'No looks yet',
  },
  emptyDescription: {
    id: 'Looks.list.emptyDescription',
    defaultMessage:
      'A look combines at least two pieces into a set with its own price. Create the first look.',
  },
  noActive: {
    id: 'Looks.list.noActive',
    defaultMessage: 'No look is active at the moment.',
  },
  emptyFiltered: {
    id: 'Looks.list.emptyFiltered',
    defaultMessage: 'No look matches your search.',
  },
  loadErrorTitle: {
    id: 'Looks.list.loadErrorTitle',
    defaultMessage: 'The looks could not be loaded',
  },
  loadErrorNote: {
    id: 'Looks.list.loadErrorNote',
    defaultMessage: 'No incomplete list is shown.',
  },
});
