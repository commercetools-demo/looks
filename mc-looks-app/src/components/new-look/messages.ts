import { defineMessages } from 'react-intl';

// German is the reference language; English lives in messages.en.json.
export default defineMessages({
  newLook: { id: 'Looks.newLook.newLook', defaultMessage: 'Neuer Look' },
  stepBasics: { id: 'Looks.newLook.stepBasics', defaultMessage: 'Grunddaten' },
  stepPieces: { id: 'Looks.newLook.stepPieces', defaultMessage: 'Teile' },
  stepSetPrice: {
    id: 'Looks.newLook.stepSetPrice',
    defaultMessage: 'Setpreis',
  },
  stepReview: { id: 'Looks.newLook.stepReview', defaultMessage: 'Prüfen' },
  cancel: { id: 'Looks.newLook.cancel', defaultMessage: 'Abbrechen' },
  back: { id: 'Looks.newLook.back', defaultMessage: 'Zurück' },
  next: { id: 'Looks.newLook.next', defaultMessage: 'Weiter' },
  saveLook: { id: 'Looks.newLook.saveLook', defaultMessage: 'Look speichern' },
  name: { id: 'Looks.newLook.name', defaultMessage: 'Name' },
  description: {
    id: 'Looks.newLook.description',
    defaultMessage: 'Beschreibung',
  },
  descriptionHelp: {
    id: 'Looks.newLook.descriptionHelp',
    defaultMessage:
      'Optional, in den Projektsprachen. Wird als Beschreibung der Rabattgruppe gespeichert.',
  },
  reviewDescription: {
    id: 'Looks.newLook.reviewDescription',
    defaultMessage: 'Beschreibung',
  },
  keyLabel: { id: 'Looks.newLook.keyLabel', defaultMessage: 'Key' },
  keyHelp: {
    id: 'Looks.newLook.keyHelp',
    defaultMessage:
      'Wird als {fullKey} gespeichert. Der Key kann nach dem Anlegen nicht mehr geändert werden.',
  },
  keyHelpEmpty: {
    id: 'Looks.newLook.keyHelpEmpty',
    defaultMessage:
      'Der Vorschlag entsteht aus dem Namen. Der Key kann nach dem Anlegen nicht mehr geändert werden.',
  },
  keyReset: {
    id: 'Looks.newLook.keyReset',
    defaultMessage: 'Vorschlag übernehmen',
  },
  errorKeyInvalid: {
    id: 'Looks.newLook.errorKeyInvalid',
    defaultMessage:
      'Der Key darf nur Buchstaben, Ziffern, Bindestriche und Unterstriche enthalten.',
  },
  errorKeyTaken: {
    id: 'Looks.newLook.errorKeyTaken',
    defaultMessage: 'Dieser Key ist schon vergeben.',
  },
  reviewKey: { id: 'Looks.newLook.reviewKey', defaultMessage: 'Key' },
  nameHelp: {
    id: 'Looks.newLook.nameHelp',
    defaultMessage: 'Der englische Name bestimmt den Schlüssel des Looks.',
  },
  photoLabel: { id: 'Looks.newLook.photoLabel', defaultMessage: 'Look-Foto' },
  photoOptional: {
    id: 'Looks.newLook.photoOptional',
    defaultMessage: '(optional)',
  },
  photoHelp: {
    id: 'Looks.newLook.photoHelp',
    defaultMessage: 'Hochformat, das Model trägt den Look',
  },
  photoPlaceholder: {
    id: 'Looks.newLook.photoPlaceholder',
    defaultMessage: 'looks/name.webp',
  },
  photoNoShop: {
    id: 'Looks.newLook.photoNoShop',
    defaultMessage:
      'Ohne Shop-Adresse kann das Foto nicht geprüft werden. Das Feld ist deaktiviert.',
  },
  photoInvalid: {
    id: 'Looks.newLook.photoInvalid',
    defaultMessage:
      'Der Pfad muss die Form looks/<name>.webp haben (auch .jpg oder .png).',
  },
  photoUnreachable: {
    id: 'Looks.newLook.photoUnreachable',
    defaultMessage: 'Das Foto konnte nicht aus dem Shop geladen werden.',
  },
  photoChecking: {
    id: 'Looks.newLook.photoChecking',
    defaultMessage: 'Foto wird geprüft',
  },
  photoAlt: {
    id: 'Looks.newLook.photoAlt',
    defaultMessage: 'Look-Foto, Vorschau',
  },
  piecesTitle: {
    id: 'Looks.newLook.piecesTitle',
    defaultMessage: 'Teile wählen ({min} bis {max})',
  },
  selectedHeading: {
    id: 'Looks.newLook.selectedHeading',
    defaultMessage: 'Gewählte Teile',
  },
  piecesCount: {
    id: 'Looks.newLook.piecesCount',
    defaultMessage:
      '{count, plural, one {# Teil gewählt} other {# Teile gewählt}}',
  },
  dropHint: {
    id: 'Looks.newLook.dropHint',
    defaultMessage: 'Teil aus der Suche hinzufügen',
  },
  searchLabel: {
    id: 'Looks.newLook.searchLabel',
    defaultMessage: 'Produktsuche',
  },
  searchPlaceholder: {
    id: 'Looks.newLook.searchPlaceholder',
    defaultMessage: 'Name, Farbe oder Artikelnummer',
  },
  noProducts: {
    id: 'Looks.newLook.noProducts',
    defaultMessage: 'Keine Produkte gefunden.',
  },
  resultsLabel: {
    id: 'Looks.newLook.resultsLabel',
    defaultMessage: 'Suchergebnisse',
  },
  add: { id: 'Looks.newLook.add', defaultMessage: 'Hinzufügen' },
  inLook: { id: 'Looks.newLook.inLook', defaultMessage: 'Im Look' },
  remove: { id: 'Looks.newLook.remove', defaultMessage: 'Entfernen' },
  moveUp: { id: 'Looks.newLook.moveUp', defaultMessage: 'Nach oben' },
  moveDown: { id: 'Looks.newLook.moveDown', defaultMessage: 'Nach unten' },
  stockLow: {
    id: 'Looks.newLook.stockLow',
    defaultMessage: '{size}: nur noch {count}',
  },
  stockSoldOut: {
    id: 'Looks.newLook.stockSoldOut',
    defaultMessage: 'ausverkauft: {sizes}',
  },
  soldOutTitle: {
    id: 'Looks.newLook.soldOutTitle',
    defaultMessage: '{piece} ist in allen Größen ausverkauft',
  },
  soldOutBody: {
    id: 'Looks.newLook.soldOutBody',
    defaultMessage:
      'Solange das so ist, kann das Set nicht zum Setpreis gekauft werden. Das Speichern ist trotzdem möglich.',
  },
  pieceColour: {
    id: 'Looks.newLook.pieceColour',
    defaultMessage: 'Farbe: {colour}',
  },
  errorName: {
    id: 'Looks.newLook.errorName',
    defaultMessage: 'Bitte mindestens einen Namen eingeben.',
  },
  errorPiecesMin: {
    id: 'Looks.newLook.errorPiecesMin',
    defaultMessage:
      'Ein Look braucht mindestens {min} Teile, gewählt sind {count}.',
  },
  errorPiecesMax: {
    id: 'Looks.newLook.errorPiecesMax',
    defaultMessage: 'Ein Look hat höchstens {max} Teile, gewählt sind {count}.',
  },
  errorDuplicate: {
    id: 'Looks.newLook.errorDuplicate',
    defaultMessage: '{piece} ist mehrfach im Look.',
  },
  errorPriceNone: {
    id: 'Looks.newLook.errorPriceNone',
    defaultMessage:
      'Tragen Sie in mindestens einer Zeile einen Setpreis ein. Zeilen gibt es nur für Währung und Land, in denen alle Teile einen Preis haben.',
  },
  errorNotPositive: {
    id: 'Looks.newLook.errorNotPositive',
    defaultMessage: '{currency}: Der Setpreis muss größer als 0 sein.',
  },
  errorNotBelowSum: {
    id: 'Looks.newLook.errorNotBelowSum',
    defaultMessage:
      '{currency}: Der Setpreis muss unter der Summe der Teile ({sum}) liegen.',
  },
  errorSumChanged: {
    id: 'Looks.newLook.errorSumChanged',
    defaultMessage:
      '{currency}: Die Summe der Teile hat sich geändert. Bitte den Setpreis prüfen.',
  },
  errorAmountFormat: {
    id: 'Looks.newLook.errorAmountFormat',
    defaultMessage: '{currency}: Bitte einen Betrag wie 189,90 eingeben.',
  },
  setPriceHeading: {
    id: 'Looks.newLook.setPriceHeading',
    defaultMessage: 'Setpreis je Währung',
  },
  setPriceLabel: {
    id: 'Looks.newLook.setPriceLabel',
    defaultMessage: 'Setpreis {currency}',
  },
  setPriceSum: {
    id: 'Looks.newLook.setPriceSum',
    defaultMessage: '{currency}: Summe der Teile {sum}',
  },
  setPriceSaving: {
    id: 'Looks.newLook.setPriceSaving',
    defaultMessage: 'Ersparnis {amount} ({percent} %)',
  },
  reviewCell: {
    id: 'Looks.newLook.reviewCell',
    defaultMessage: '{cell}: {setPrice} (Summe {sum}, Ersparnis {saving})',
  },
  reviewTitle: {
    id: 'Looks.newLook.reviewTitle',
    defaultMessage: 'Zusammenfassung',
  },
  reviewName: { id: 'Looks.newLook.reviewName', defaultMessage: 'Name' },
  reviewPhoto: { id: 'Looks.newLook.reviewPhoto', defaultMessage: 'Look-Foto' },
  reviewNoPhoto: {
    id: 'Looks.newLook.reviewNoPhoto',
    defaultMessage: 'kein Foto',
  },
  reviewPieces: { id: 'Looks.newLook.reviewPieces', defaultMessage: 'Teile' },
  reviewSum: {
    id: 'Looks.newLook.reviewSum',
    defaultMessage: 'Summe der Teile',
  },
  reviewSetPrice: {
    id: 'Looks.newLook.reviewSetPrice',
    defaultMessage: 'Setpreis',
  },
  reviewSaving: {
    id: 'Looks.newLook.reviewSaving',
    defaultMessage: 'Ersparnis',
  },
  activateLabel: {
    id: 'Looks.newLook.activateLabel',
    defaultMessage: 'Nach dem Anlegen aktiv',
  },
  activateHelp: {
    id: 'Looks.newLook.activateHelp',
    defaultMessage:
      'Aus: Der Look wird inaktiv angelegt und kann danach in der Liste eingeschaltet werden.',
  },
  saveFailedTitle: {
    id: 'Looks.newLook.saveFailedTitle',
    defaultMessage: 'Der Look ist nur teilweise gespeichert',
  },
  saveFailedNoneTitle: {
    id: 'Looks.newLook.saveFailedNoneTitle',
    defaultMessage: 'Der Look konnte nicht gespeichert werden',
  },
  failedDiscount: {
    id: 'Looks.newLook.failedDiscount',
    defaultMessage: 'Fehlgeschlagen ist der Schritt: Setpreis-Rabatt anlegen.',
  },
  failedObject: {
    id: 'Looks.newLook.failedObject',
    defaultMessage:
      'Fehlgeschlagen ist der Schritt: Look-Definition speichern.',
  },
  failedActivation: {
    id: 'Looks.newLook.failedActivation',
    defaultMessage: 'Fehlgeschlagen ist der Schritt: Look aktivieren.',
  },
  saved: { id: 'Looks.newLook.saved', defaultMessage: 'Look gespeichert' },
  savedActive: {
    id: 'Looks.newLook.savedActive',
    defaultMessage: '{name} ist aktiv.',
  },
  savedInactive: {
    id: 'Looks.newLook.savedInactive',
    defaultMessage:
      '{name} ist inaktiv und kann in der Liste eingeschaltet werden.',
  },
  stepsLabel: { id: 'Looks.newLook.stepsLabel', defaultMessage: 'Schritte' },
});
