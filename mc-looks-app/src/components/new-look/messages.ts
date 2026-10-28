/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineMessages } from 'react-intl';

// English is the reference language (the default messages); the German texts live in src/i18n/data/de.json.
export default defineMessages({
  newLook: { id: 'Looks.newLook.newLook', defaultMessage: 'New look' },
  stepBasics: { id: 'Looks.newLook.stepBasics', defaultMessage: 'Basics' },
  stepPieces: { id: 'Looks.newLook.stepPieces', defaultMessage: 'Pieces' },
  stepSetPrice: {
    id: 'Looks.newLook.stepSetPrice',
    defaultMessage: 'Set price',
  },
  stepReview: { id: 'Looks.newLook.stepReview', defaultMessage: 'Review' },
  cancel: { id: 'Looks.newLook.cancel', defaultMessage: 'Cancel' },
  back: { id: 'Looks.newLook.back', defaultMessage: 'Back' },
  next: { id: 'Looks.newLook.next', defaultMessage: 'Next' },
  saveLook: { id: 'Looks.newLook.saveLook', defaultMessage: 'Save look' },
  name: { id: 'Looks.newLook.name', defaultMessage: 'Name' },
  description: {
    id: 'Looks.newLook.description',
    defaultMessage: 'Description',
  },
  descriptionHelp: {
    id: 'Looks.newLook.descriptionHelp',
    defaultMessage:
      'Optional, in the project languages. Saved as the description of the discount group.',
  },
  reviewDescription: {
    id: 'Looks.newLook.reviewDescription',
    defaultMessage: 'Description',
  },
  keyLabel: { id: 'Looks.newLook.keyLabel', defaultMessage: 'Key' },
  keyHelp: {
    id: 'Looks.newLook.keyHelp',
    defaultMessage:
      'Saved as {fullKey}. The key cannot be changed after the look is created.',
  },
  keyHelpEmpty: {
    id: 'Looks.newLook.keyHelpEmpty',
    defaultMessage:
      'The suggestion is derived from the name. The key cannot be changed after the look is created.',
  },
  keyReset: {
    id: 'Looks.newLook.keyReset',
    defaultMessage: 'Use suggestion',
  },
  errorKeyInvalid: {
    id: 'Looks.newLook.errorKeyInvalid',
    defaultMessage:
      'The key may only contain letters, digits, hyphens and underscores.',
  },
  errorKeyTaken: {
    id: 'Looks.newLook.errorKeyTaken',
    defaultMessage: 'This key is already taken.',
  },
  reviewKey: { id: 'Looks.newLook.reviewKey', defaultMessage: 'Key' },
  selectedHeading: {
    id: 'Looks.newLook.selectedHeading',
    defaultMessage: 'Chosen pieces',
  },
  piecesCount: {
    id: 'Looks.newLook.piecesCount',
    defaultMessage:
      '{count, plural, one {# piece chosen} other {# pieces chosen}}',
  },
  dropHint: {
    id: 'Looks.newLook.dropHint',
    defaultMessage: 'Add a piece from the search',
  },
  searchLabel: {
    id: 'Looks.newLook.searchLabel',
    defaultMessage: 'Product search',
  },
  searchPlaceholder: {
    id: 'Looks.newLook.searchPlaceholder',
    defaultMessage: 'Name, description, product ID or SKU',
  },
  noProducts: {
    id: 'Looks.newLook.noProducts',
    defaultMessage: 'No products found.',
  },
  resultsLabel: {
    id: 'Looks.newLook.resultsLabel',
    defaultMessage: 'Search results',
  },
  add: { id: 'Looks.newLook.add', defaultMessage: 'Add' },
  inLook: { id: 'Looks.newLook.inLook', defaultMessage: 'In the look' },
  remove: { id: 'Looks.newLook.remove', defaultMessage: 'Remove' },
  moveUp: { id: 'Looks.newLook.moveUp', defaultMessage: 'Move up' },
  moveDown: { id: 'Looks.newLook.moveDown', defaultMessage: 'Move down' },
  stockLow: {
    id: 'Looks.newLook.stockLow',
    defaultMessage: '{size}: only {count} left',
  },
  stockSoldOut: {
    id: 'Looks.newLook.stockSoldOut',
    defaultMessage: 'sold out: {sizes}',
  },
  soldOutTitle: {
    id: 'Looks.newLook.soldOutTitle',
    defaultMessage: '{piece} is sold out in every size',
  },
  soldOutBody: {
    id: 'Looks.newLook.soldOutBody',
    defaultMessage:
      'As long as this lasts, the set cannot be bought at the set price. Saving is still possible.',
  },
  errorName: {
    id: 'Looks.newLook.errorName',
    defaultMessage: 'Please enter at least one name.',
  },
  errorPiecesMin: {
    id: 'Looks.newLook.errorPiecesMin',
    defaultMessage: 'A look needs at least {min} pieces, {count} chosen.',
  },
  errorDuplicate: {
    id: 'Looks.newLook.errorDuplicate',
    defaultMessage: '{piece} is in the look more than once.',
  },
  errorPriceNone: {
    id: 'Looks.newLook.errorPriceNone',
    defaultMessage:
      'Enter a set price in at least one row. Rows exist only for a currency and country in which every piece has a price.',
  },
  errorNotPositive: {
    id: 'Looks.newLook.errorNotPositive',
    defaultMessage: '{currency}: The set price must be greater than 0.',
  },
  errorPercentInvalid: {
    id: 'Looks.newLook.errorPercentInvalid',
    defaultMessage:
      '{currency}: The saving in percent must be above 0 and below 100.',
  },
  errorModeMixed: {
    id: 'Looks.newLook.errorModeMixed',
    defaultMessage:
      '{currency}: Per country a look uses either amounts or one percentage.',
  },
  reviewCellPercent: {
    id: 'Looks.newLook.reviewCellPercent',
    defaultMessage:
      '{cell}: −{percent}% → {setPrice} (sum {sum}, saving {saving})',
  },
  errorNotBelowSum: {
    id: 'Looks.newLook.errorNotBelowSum',
    defaultMessage:
      '{currency}: The set price must be below the sum of the pieces ({sum}).',
  },
  errorSumChanged: {
    id: 'Looks.newLook.errorSumChanged',
    defaultMessage:
      '{currency}: The sum of the pieces has changed. Please check the set price.',
  },
  errorAmountFormat: {
    id: 'Looks.newLook.errorAmountFormat',
    defaultMessage: '{currency}: Please enter an amount like 189.90.',
  },
  setPriceHeading: {
    id: 'Looks.newLook.setPriceHeading',
    defaultMessage: 'Set price per currency and country',
  },
  setPriceLabel: {
    id: 'Looks.newLook.setPriceLabel',
    defaultMessage: 'Set price {currency}',
  },
  setPriceSum: {
    id: 'Looks.newLook.setPriceSum',
    defaultMessage: '{currency}: sum of the pieces {sum}',
  },
  setPriceSaving: {
    id: 'Looks.newLook.setPriceSaving',
    defaultMessage: 'Saving {amount} ({percent}%)',
  },
  reviewCell: {
    id: 'Looks.newLook.reviewCell',
    defaultMessage: '{cell}: {setPrice} (sum {sum}, saving {saving})',
  },
  reviewTitle: {
    id: 'Looks.newLook.reviewTitle',
    defaultMessage: 'Summary',
  },
  reviewName: { id: 'Looks.newLook.reviewName', defaultMessage: 'Name' },
  reviewPieces: { id: 'Looks.newLook.reviewPieces', defaultMessage: 'Pieces' },
  reviewSum: {
    id: 'Looks.newLook.reviewSum',
    defaultMessage: 'Sum of the pieces',
  },
  reviewSetPrice: {
    id: 'Looks.newLook.reviewSetPrice',
    defaultMessage: 'Set price',
  },
  reviewSaving: {
    id: 'Looks.newLook.reviewSaving',
    defaultMessage: 'Saving',
  },
  activateLabel: {
    id: 'Looks.newLook.activateLabel',
    defaultMessage: 'Active after creating',
  },
  activateHelp: {
    id: 'Looks.newLook.activateHelp',
    defaultMessage:
      'Off: the look is created inactive and can be switched on in the list afterwards.',
  },
  saveFailedTitle: {
    id: 'Looks.newLook.saveFailedTitle',
    defaultMessage: 'The look is only partly saved',
  },
  saveFailedNoneTitle: {
    id: 'Looks.newLook.saveFailedNoneTitle',
    defaultMessage: 'The look could not be saved',
  },
  failedDiscount: {
    id: 'Looks.newLook.failedDiscount',
    defaultMessage: 'The failed step: create the set-price discount.',
  },
  failedObject: {
    id: 'Looks.newLook.failedObject',
    defaultMessage: 'The failed step: save the look definition.',
  },
  failedActivation: {
    id: 'Looks.newLook.failedActivation',
    defaultMessage: 'The failed step: activate the look.',
  },
  saved: { id: 'Looks.newLook.saved', defaultMessage: 'Look saved' },
  savedActive: {
    id: 'Looks.newLook.savedActive',
    defaultMessage: '{name} is active.',
  },
  savedInactive: {
    id: 'Looks.newLook.savedInactive',
    defaultMessage: '{name} is inactive and can be switched on in the list.',
  },
  stepsLabel: { id: 'Looks.newLook.stepsLabel', defaultMessage: 'Steps' },
});
