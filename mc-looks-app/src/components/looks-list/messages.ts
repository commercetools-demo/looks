import { defineMessages } from 'react-intl';

// German is the reference language; English lives in messages.en.json.
export default defineMessages({
  newLook: { id: 'Looks.list.newLook', defaultMessage: 'Neuer Look' },
  searchLabel: {
    id: 'Looks.list.searchLabel',
    defaultMessage: 'Looks durchsuchen',
  },
  searchPlaceholder: {
    id: 'Looks.list.searchPlaceholder',
    defaultMessage: 'Nach Namen suchen',
  },
  looksCount: {
    id: 'Looks.list.looksCount',
    defaultMessage: '{count, plural, one {# Look} other {# Looks}}',
  },
  columnLook: { id: 'Looks.list.columnLook', defaultMessage: 'Look' },
  columnPieces: { id: 'Looks.list.columnPieces', defaultMessage: 'Teile' },
  columnSetPrice: {
    id: 'Looks.list.columnSetPrice',
    defaultMessage: 'Setpreis',
  },
  columnSum: { id: 'Looks.list.columnSum', defaultMessage: 'Summe' },
  columnSaving: { id: 'Looks.list.columnSaving', defaultMessage: 'Ersparnis' },
  columnStatus: { id: 'Looks.list.columnStatus', defaultMessage: 'Status' },
  columnActive: { id: 'Looks.list.columnActive', defaultMessage: 'Aktiv' },
  savingValue: { id: 'Looks.list.savingValue', defaultMessage: '{percent} %' },
  piecesMore: {
    id: 'Looks.list.piecesMore',
    defaultMessage: '+{count}',
  },
  piecesStrip: {
    id: 'Looks.list.piecesStrip',
    defaultMessage: 'Teile: {names}',
  },
  complete: { id: 'Looks.list.complete', defaultMessage: 'Vervollständigen' },
  completeLabel: {
    id: 'Looks.list.completeLabel',
    defaultMessage: '{name} vervollständigen',
  },
  sortedBy: {
    id: 'Looks.list.sortedBy',
    defaultMessage:
      'Sortiert nach {column}, {direction, select, asc {aufsteigend} other {absteigend}}',
  },
  pricesLoading: {
    id: 'Looks.list.pricesLoading',
    defaultMessage: 'Preise werden geladen',
  },
  pagination: {
    id: 'Looks.list.pagination',
    defaultMessage: 'Seiten der Looks',
  },
  emptyTitle: {
    id: 'Looks.list.emptyTitle',
    defaultMessage: 'Noch keine Looks',
  },
  emptyDescription: {
    id: 'Looks.list.emptyDescription',
    defaultMessage:
      'Ein Look fasst mindestens zwei Teile zu einem Set mit eigenem Preis zusammen. Legen Sie den ersten Look an.',
  },
  noActive: {
    id: 'Looks.list.noActive',
    defaultMessage: 'Zurzeit ist kein Look aktiv.',
  },
  emptyFiltered: {
    id: 'Looks.list.emptyFiltered',
    defaultMessage: 'Kein Look passt zu Ihrer Suche.',
  },
  loadErrorTitle: {
    id: 'Looks.list.loadErrorTitle',
    defaultMessage: 'Die Looks konnten nicht geladen werden',
  },
  loadErrorNote: {
    id: 'Looks.list.loadErrorNote',
    defaultMessage: 'Es wird keine unvollständige Liste angezeigt.',
  },
});
