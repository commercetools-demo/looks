/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineMessages } from 'react-intl';

// English is the reference language (the default messages); the German texts live in src/i18n/data/de.json.
export default defineMessages({
  backToList: {
    id: 'Looks.detail.backToList',
    defaultMessage: 'Back to looks',
  },
  statusLabel: { id: 'Looks.detail.statusLabel', defaultMessage: 'Status' },
  loadErrorTitle: {
    id: 'Looks.detail.loadErrorTitle',
    defaultMessage: 'The look could not be loaded',
  },
  notFoundTitle: {
    id: 'Looks.detail.notFoundTitle',
    defaultMessage: 'Look not found',
  },
  notFoundDescription: {
    id: 'Looks.detail.notFoundDescription',
    defaultMessage:
      'There is neither a look definition nor a set-price discount for the key "{key}".',
  },
  piecesTitle: {
    id: 'Looks.detail.piecesTitle',
    defaultMessage: 'Pieces ({count})',
  },
  soldOutAlertTitle: {
    id: 'Looks.detail.soldOutAlertTitle',
    defaultMessage: '{piece} is sold out in every size',
  },
  soldOutAlertDescription: {
    id: 'Looks.detail.soldOutAlertDescription',
    defaultMessage:
      'A set needs every piece in one size. The set cannot be bought at the set price.',
  },
  driftDescription: {
    id: 'Looks.detail.driftDescription',
    defaultMessage:
      'The single prices changed since the look was set up: the discount no longer lands on the stored set price.',
  },
  recalculate: {
    id: 'Looks.detail.recalculate',
    defaultMessage: 'Recalculate set price',
  },
  deleteDescription: {
    id: 'Looks.detail.deleteDescription',
    defaultMessage:
      'Removes the look definition, the discounts of all countries and the discount group. This cannot be undone.',
  },
  deleteActiveWarning: {
    id: 'Looks.detail.deleteActiveWarning',
    defaultMessage:
      'The look is on: its discounts disappear from the shop at once.',
  },
  deleteButton: {
    id: 'Looks.detail.deleteButton',
    defaultMessage: 'Delete look',
  },
  deleteConfirm: {
    id: 'Looks.detail.deleteConfirm',
    defaultMessage: 'Delete look “{name}” for good?',
  },
  deleteConfirmButton: {
    id: 'Looks.detail.deleteConfirmButton',
    defaultMessage: 'Delete for good',
  },
  deleted: {
    id: 'Looks.detail.deleted',
    defaultMessage: 'Look “{name}” deleted',
  },
  setPriceTitle: {
    id: 'Looks.detail.setPriceTitle',
    defaultMessage: 'Set price',
  },
  setPriceLabel: {
    id: 'Looks.detail.setPriceLabel',
    defaultMessage: 'Set price in {currency}',
  },
  setPriceSave: {
    id: 'Looks.detail.setPriceSave',
    defaultMessage: 'Save set price',
  },
  setPriceSaved: {
    id: 'Looks.detail.setPriceSaved',
    defaultMessage: 'Set price saved',
  },
  noChange: { id: 'Looks.detail.noChange', defaultMessage: 'No change' },
  staleTitle: {
    id: 'Looks.detail.staleTitle',
    defaultMessage: 'Set price not yet updated in the shop',
  },
  staleDescription: {
    id: 'Looks.detail.staleDescription',
    defaultMessage:
      'The discount is changed, the look definition is not yet. Please try again.',
  },
  errNotPositive: {
    id: 'Looks.detail.errNotPositive',
    defaultMessage: 'Please enter a set price above 0',
  },
  errPercent: {
    id: 'Looks.detail.errPercent',
    defaultMessage: 'The saving must be above 0% and below 100%',
  },
  errModeMixed: {
    id: 'Looks.detail.errModeMixed',
    defaultMessage: 'Per country a look uses either amounts or one percentage',
  },
  errNotBelowSum: {
    id: 'Looks.detail.errNotBelowSum',
    defaultMessage:
      'The set price must be below the sum of the single prices ({sum})',
  },
  errSumNotLive: {
    id: 'Looks.detail.errSumNotLive',
    defaultMessage: 'The single prices changed. Please reload the page.',
  },
  errPieces: {
    id: 'Looks.detail.errPieces',
    defaultMessage: 'At least one piece has no price or is not loaded.',
  },
  completeMissingObject: {
    id: 'Looks.detail.completeMissingObject',
    defaultMessage:
      'The look definition for this set-price discount is missing. Completing creates it from the discount. The look stays as it is.',
  },
  completeMissingDiscount: {
    id: 'Looks.detail.completeMissingDiscount',
    defaultMessage:
      'The set-price discount for this look definition is missing. Completing creates it inactive. The look stays switched off.',
  },
  completeInconsistent: {
    id: 'Looks.detail.completeInconsistent',
    defaultMessage:
      'The look definition and the set-price discount name different pieces. The look cannot be switched here; please check it in the Merchant Center.',
  },
  completeAction: {
    id: 'Looks.detail.completeAction',
    defaultMessage: 'Complete',
  },
  completeName: {
    id: 'Looks.detail.completeName',
    defaultMessage: 'Look name',
  },
  completed: {
    id: 'Looks.detail.completed',
    defaultMessage: 'Look completed',
  },
});
