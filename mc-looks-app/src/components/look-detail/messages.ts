import { defineMessages } from 'react-intl';

// German is the reference language; English lives in messages.en.json.
export default defineMessages({
  backToList: {
    id: 'Looks.detail.backToList',
    defaultMessage: 'Zurück zu Looks',
  },
  statusLabel: { id: 'Looks.detail.statusLabel', defaultMessage: 'Status' },
  loadErrorTitle: {
    id: 'Looks.detail.loadErrorTitle',
    defaultMessage: 'Der Look konnte nicht geladen werden',
  },
  notFoundTitle: {
    id: 'Looks.detail.notFoundTitle',
    defaultMessage: 'Look nicht gefunden',
  },
  notFoundDescription: {
    id: 'Looks.detail.notFoundDescription',
    defaultMessage:
      'Zum Schlüssel „{key}“ gibt es weder eine Look-Definition noch einen Setpreis-Rabatt.',
  },
  piecesTitle: {
    id: 'Looks.detail.piecesTitle',
    defaultMessage: 'Teile ({count})',
  },
  soldOutAlertTitle: {
    id: 'Looks.detail.soldOutAlertTitle',
    defaultMessage: '{piece} ist in allen Größen ausverkauft',
  },
  soldOutAlertDescription: {
    id: 'Looks.detail.soldOutAlertDescription',
    defaultMessage:
      'Ein Set braucht jedes Teil in einer Größe. Das Set ist nicht zum Setpreis kaufbar.',
  },
  driftDescription: {
    id: 'Looks.detail.driftDescription',
    defaultMessage:
      'Die Einzelpreise haben sich seit dem Anlegen geändert: Der Rabatt führt nicht mehr auf den gespeicherten Setpreis.',
  },
  recalculate: {
    id: 'Looks.detail.recalculate',
    defaultMessage: 'Setpreis neu berechnen',
  },
  missingCurrencyTitle: {
    id: 'Looks.detail.missingCurrencyTitle',
    defaultMessage: 'Setpreis fehlt in einer Währung',
  },
  missingCurrencyDescription: {
    id: 'Looks.detail.missingCurrencyDescription',
    defaultMessage:
      'Bitte für jede Währung des Projekts einen Setpreis eingeben und speichern.',
  },
  deleteDescription: {
    id: 'Looks.detail.deleteDescription',
    defaultMessage:
      'Entfernt die Look-Definition, alle Rabatte der Länder und die Rabattgruppe. Das lässt sich nicht rückgängig machen.',
  },
  deleteActiveWarning: {
    id: 'Looks.detail.deleteActiveWarning',
    defaultMessage:
      'Der Look ist aktiv: Seine Rabatte verschwinden sofort aus dem Shop.',
  },
  deleteButton: {
    id: 'Looks.detail.deleteButton',
    defaultMessage: 'Look löschen',
  },
  deleteConfirm: {
    id: 'Looks.detail.deleteConfirm',
    defaultMessage: 'Look „{name}“ endgültig löschen?',
  },
  deleteConfirmButton: {
    id: 'Looks.detail.deleteConfirmButton',
    defaultMessage: 'Endgültig löschen',
  },
  deleted: {
    id: 'Looks.detail.deleted',
    defaultMessage: 'Look „{name}“ gelöscht',
  },
  setPriceTitle: {
    id: 'Looks.detail.setPriceTitle',
    defaultMessage: 'Setpreis',
  },
  setPriceLabel: {
    id: 'Looks.detail.setPriceLabel',
    defaultMessage: 'Setpreis in {currency}',
  },
  setPriceSave: {
    id: 'Looks.detail.setPriceSave',
    defaultMessage: 'Setpreis speichern',
  },
  setPriceSaved: {
    id: 'Looks.detail.setPriceSaved',
    defaultMessage: 'Setpreis gespeichert',
  },
  noChange: { id: 'Looks.detail.noChange', defaultMessage: 'Keine Änderung' },
  staleTitle: {
    id: 'Looks.detail.staleTitle',
    defaultMessage: 'Setpreis im Shop noch nicht aktualisiert',
  },
  staleDescription: {
    id: 'Looks.detail.staleDescription',
    defaultMessage:
      'Der Rabatt ist geändert, die Look-Definition noch nicht. Bitte erneut versuchen.',
  },
  errNotPositive: {
    id: 'Looks.detail.errNotPositive',
    defaultMessage: 'Bitte einen Setpreis über 0 eingeben',
  },
  errPercent: {
    id: 'Looks.detail.errPercent',
    defaultMessage:
      'Die Ersparnis muss größer als 0 % und kleiner als 100 % sein',
  },
  errModeMixed: {
    id: 'Looks.detail.errModeMixed',
    defaultMessage:
      'Pro Land nutzt ein Look entweder Beträge oder einen einzigen Prozentwert',
  },
  errNotBelowSum: {
    id: 'Looks.detail.errNotBelowSum',
    defaultMessage:
      'Der Setpreis muss unter der Summe der Einzelpreise liegen ({sum})',
  },
  errSumNotLive: {
    id: 'Looks.detail.errSumNotLive',
    defaultMessage:
      'Die Einzelpreise haben sich geändert. Bitte die Seite neu laden.',
  },
  errPieces: {
    id: 'Looks.detail.errPieces',
    defaultMessage:
      'Mindestens ein Teil hat keinen Preis oder ist nicht geladen.',
  },
  completeMissingObject: {
    id: 'Looks.detail.completeMissingObject',
    defaultMessage:
      'Zu diesem Setpreis-Rabatt fehlt die Look-Definition. Vervollständigen legt sie aus dem Rabatt an. Der Look bleibt, wie er ist.',
  },
  completeMissingDiscount: {
    id: 'Looks.detail.completeMissingDiscount',
    defaultMessage:
      'Zu dieser Look-Definition fehlt der Setpreis-Rabatt. Vervollständigen legt ihn inaktiv an. Der Look bleibt ausgeschaltet.',
  },
  completeInconsistent: {
    id: 'Looks.detail.completeInconsistent',
    defaultMessage:
      'Look-Definition und Setpreis-Rabatt nennen verschiedene Teile. Der Look lässt sich hier nicht schalten; bitte im Merchant Center prüfen.',
  },
  completeAction: {
    id: 'Looks.detail.completeAction',
    defaultMessage: 'Vervollständigen',
  },
  completeName: {
    id: 'Looks.detail.completeName',
    defaultMessage: 'Look-Name',
  },
  completed: {
    id: 'Looks.detail.completed',
    defaultMessage: 'Look vervollständigt',
  },
});
