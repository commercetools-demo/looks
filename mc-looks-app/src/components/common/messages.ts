import { defineMessages } from 'react-intl';

// German is the reference language; English lives in messages.en.json.
export default defineMessages({
  appTitle: { id: 'Looks.common.appTitle', defaultMessage: 'Looks' },
  viewOnly: { id: 'Looks.common.viewOnly', defaultMessage: 'Nur Lesezugriff' },
  loading: { id: 'Looks.common.loading', defaultMessage: 'Wird geladen' },
  retry: { id: 'Looks.common.retry', defaultMessage: 'Erneut versuchen' },
  noValue: { id: 'Looks.common.noValue', defaultMessage: 'nicht verfügbar' },
  imageMissing: {
    id: 'Looks.common.imageMissing',
    defaultMessage: 'Bild folgt',
  },
  unnamedLook: { id: 'Looks.common.unnamedLook', defaultMessage: 'Look {key}' },
  oneSize: { id: 'Looks.common.oneSize', defaultMessage: 'Einheitsgröße' },
  statusActive: { id: 'Looks.common.statusActive', defaultMessage: 'Aktiv' },
  statusInactive: {
    id: 'Looks.common.statusInactive',
    defaultMessage: 'Inaktiv',
  },
  incomplete: {
    id: 'Looks.common.incomplete',
    defaultMessage: 'Unvollständig',
  },
  priceDrift: {
    id: 'Looks.common.priceDrift',
    defaultMessage: 'Setpreis weicht ab',
  },
  currenciesLoadError: {
    id: 'Looks.common.currenciesLoadError',
    defaultMessage: 'Die Währungen des Projekts konnten nicht geladen werden',
  },
  currenciesMissing: {
    id: 'Looks.common.currenciesMissing',
    defaultMessage: 'Das Projekt hat keine Währung.',
  },
  switchLabel: {
    id: 'Looks.common.switchLabel',
    defaultMessage: '{name} aktiv',
  },
  switchConflict: {
    id: 'Looks.common.switchConflict',
    defaultMessage:
      'Der Rabatt wurde inzwischen geändert. Angezeigt wird jetzt sein aktueller Stand.',
  },
  switchedOn: {
    id: 'Looks.common.switchedOn',
    defaultMessage: '{name} ist aktiv',
  },
  switchedOff: {
    id: 'Looks.common.switchedOff',
    defaultMessage: '{name} ist ausgeschaltet',
  },
  errorForbidden: {
    id: 'Looks.common.errorForbidden',
    defaultMessage:
      'Keine Berechtigung für: {operation}. Die Registrierung der App braucht den passenden Scope.',
  },
  errorConflict: {
    id: 'Looks.common.errorConflict',
    defaultMessage:
      '{operation}: Die Daten wurden inzwischen geändert. Bitte neu laden.',
  },
  errorLimit: {
    id: 'Looks.common.errorLimit',
    defaultMessage:
      '{operation}: Es sind bereits 100 Rabatte ohne Code aktiv. Bitte zuerst einen ausschalten.',
  },
  errorNetwork: {
    id: 'Looks.common.errorNetwork',
    defaultMessage:
      '{operation}: Keine Verbindung. Bitte noch einmal versuchen.',
  },
  errorGeneric: {
    id: 'Looks.common.errorGeneric',
    defaultMessage: '{operation} ist fehlgeschlagen: {message}',
  },
  errorSortOrderExhausted: {
    id: 'Looks.common.errorSortOrderExhausted',
    defaultMessage: 'Für Look-Rabatte ist kein Rang mehr frei (0,7 bis 0,799).',
  },
  opReadProject: {
    id: 'Looks.common.opReadProject',
    defaultMessage: 'Projekt lesen',
  },
  opReadLooks: {
    id: 'Looks.common.opReadLooks',
    defaultMessage: 'Looks lesen',
  },
  opReadProducts: {
    id: 'Looks.common.opReadProducts',
    defaultMessage: 'Produkte lesen',
  },
  opSearchProducts: {
    id: 'Looks.common.opSearchProducts',
    defaultMessage: 'Produktsuche',
  },
  opReadOrders: {
    id: 'Looks.common.opReadOrders',
    defaultMessage: 'Bestellungen lesen',
  },
  opCreateDiscount: {
    id: 'Looks.common.opCreateDiscount',
    defaultMessage: 'Setpreis-Rabatt anlegen',
  },
  opActivateDiscount: {
    id: 'Looks.common.opActivateDiscount',
    defaultMessage: 'Rabatt aktivieren',
  },
  opSwitchDiscount: {
    id: 'Looks.common.opSwitchDiscount',
    defaultMessage: 'Look ein- oder ausschalten',
  },
  opChangeDiscountValue: {
    id: 'Looks.common.opChangeDiscountValue',
    defaultMessage: 'Rabattbetrag ändern',
  },
  opCompleteDiscount: {
    id: 'Looks.common.opCompleteDiscount',
    defaultMessage: 'Look vervollständigen',
  },
  opWriteLookObject: {
    id: 'Looks.common.opWriteLookObject',
    defaultMessage: 'Look-Definition speichern',
  },
});
