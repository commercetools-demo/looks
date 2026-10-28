/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineMessages } from 'react-intl';

// English is the reference language (the default messages); the German texts live in src/i18n/data/de.json.
export default defineMessages({
  appTitle: { id: 'Looks.common.appTitle', defaultMessage: 'Looks' },
  viewOnly: { id: 'Looks.common.viewOnly', defaultMessage: 'Read only' },
  loading: { id: 'Looks.common.loading', defaultMessage: 'Loading' },
  retry: { id: 'Looks.common.retry', defaultMessage: 'Try again' },
  noValue: { id: 'Looks.common.noValue', defaultMessage: 'not available' },
  imageMissing: {
    id: 'Looks.common.imageMissing',
    defaultMessage: 'Image to follow',
  },
  unnamedLook: { id: 'Looks.common.unnamedLook', defaultMessage: 'Look {key}' },
  oneSize: { id: 'Looks.common.oneSize', defaultMessage: 'One size' },
  statusActive: { id: 'Looks.common.statusActive', defaultMessage: 'Active' },
  statusInactive: {
    id: 'Looks.common.statusInactive',
    defaultMessage: 'Inactive',
  },
  incomplete: {
    id: 'Looks.common.incomplete',
    defaultMessage: 'Incomplete',
  },
  priceDrift: {
    id: 'Looks.common.priceDrift',
    defaultMessage: 'Set price differs',
  },
  settingsLoadError: {
    id: 'Looks.common.settingsLoadError',
    defaultMessage:
      "The project's currencies and languages could not be loaded",
  },
  languagesMissing: {
    id: 'Looks.common.languagesMissing',
    defaultMessage: 'The project has no language.',
  },
  currenciesMissing: {
    id: 'Looks.common.currenciesMissing',
    defaultMessage: 'The project has no currency.',
  },
  switchLabel: {
    id: 'Looks.common.switchLabel',
    defaultMessage: '{name} active',
  },
  switchConflict: {
    id: 'Looks.common.switchConflict',
    defaultMessage:
      'The discount was changed in the meantime. Its current state is shown now.',
  },
  switchedOn: {
    id: 'Looks.common.switchedOn',
    defaultMessage: '{name} is active',
  },
  switchedOff: {
    id: 'Looks.common.switchedOff',
    defaultMessage: '{name} is switched off',
  },
  errorForbidden: {
    id: 'Looks.common.errorForbidden',
    defaultMessage:
      "No permission for: {operation}. The app's registration needs the matching scope.",
  },
  errorConflict: {
    id: 'Looks.common.errorConflict',
    defaultMessage:
      '{operation}: The data was changed in the meantime. Please reload.',
  },
  errorLimit: {
    id: 'Looks.common.errorLimit',
    defaultMessage:
      '{operation}: 100 discounts without a code are already active. Please switch one off first.',
  },
  errorNetwork: {
    id: 'Looks.common.errorNetwork',
    defaultMessage: '{operation}: No connection. Please try again.',
  },
  errorGeneric: {
    id: 'Looks.common.errorGeneric',
    defaultMessage: '{operation} failed: {message}',
  },
  errorSortOrderExhausted: {
    id: 'Looks.common.errorSortOrderExhausted',
    defaultMessage: 'No rank is left for look discounts (0.7 to 0.799).',
  },
  opReadProject: {
    id: 'Looks.common.opReadProject',
    defaultMessage: 'Read project',
  },
  opReadLooks: {
    id: 'Looks.common.opReadLooks',
    defaultMessage: 'Read looks',
  },
  opReadProducts: {
    id: 'Looks.common.opReadProducts',
    defaultMessage: 'Read products',
  },
  opSearchProducts: {
    id: 'Looks.common.opSearchProducts',
    defaultMessage: 'Product search',
  },
  opReadOrders: {
    id: 'Looks.common.opReadOrders',
    defaultMessage: 'Read orders',
  },
  opCreateDiscount: {
    id: 'Looks.common.opCreateDiscount',
    defaultMessage: 'Create set-price discount',
  },
  opActivateDiscount: {
    id: 'Looks.common.opActivateDiscount',
    defaultMessage: 'Activate discount',
  },
  opSwitchDiscount: {
    id: 'Looks.common.opSwitchDiscount',
    defaultMessage: 'Switch look on or off',
  },
  opChangeDiscountValue: {
    id: 'Looks.common.opChangeDiscountValue',
    defaultMessage: 'Change discount amount',
  },
  opCreateDiscountGroup: {
    id: 'Looks.common.opCreateDiscountGroup',
    defaultMessage: 'Creating the discount group',
  },
  opSwitchDiscountGroup: {
    id: 'Looks.common.opSwitchDiscountGroup',
    defaultMessage: 'Switching the discount group',
  },
  opCompleteDiscount: {
    id: 'Looks.common.opCompleteDiscount',
    defaultMessage: 'Complete look',
  },
  cancel: { id: 'Looks.common.cancel', defaultMessage: 'Cancel' },
  opDeleteLook: {
    id: 'Looks.common.opDeleteLook',
    defaultMessage: 'Deleting the look',
  },
  opWriteLookObject: {
    id: 'Looks.common.opWriteLookObject',
    defaultMessage: 'Save look definition',
  },
  priceTableCurrency: {
    id: 'Looks.common.priceTableCurrency',
    defaultMessage: 'Currency',
  },
  priceTableCountry: {
    id: 'Looks.common.priceTableCountry',
    defaultMessage: 'Country',
  },
  priceTableCountryAll: {
    id: 'Looks.common.priceTableCountryAll',
    defaultMessage: 'no country',
  },
  priceTableSum: { id: 'Looks.common.priceTableSum', defaultMessage: 'Sum' },
  priceTableSetPrice: {
    id: 'Looks.common.priceTableSetPrice',
    defaultMessage: 'Set price',
  },
  priceTableSaving: {
    id: 'Looks.common.priceTableSaving',
    defaultMessage: 'Saving %',
  },
  priceTableCellLabel: {
    id: 'Looks.common.priceTableCellLabel',
    defaultMessage: 'Set price {currency} {country}',
  },
  priceTablePercentLabel: {
    id: 'Looks.common.priceTablePercentLabel',
    defaultMessage: 'Saving in percent {currency} {country}',
  },
  priceTableGlobalPercent: {
    id: 'Looks.common.priceTableGlobalPercent',
    defaultMessage: 'Percentage for all rows',
  },
  priceTableDiscount: {
    id: 'Looks.common.priceTableDiscount',
    defaultMessage: 'Discount',
  },
  priceTableModePercent: {
    id: 'Looks.common.priceTableModePercent',
    defaultMessage: 'Percent',
  },
  priceTableModeAmount: {
    id: 'Looks.common.priceTableModeAmount',
    defaultMessage: 'Amount',
  },
  priceTableHint: {
    id: 'Looks.common.priceTableHint',
    defaultMessage:
      'Prices of the master variant; a row exists only where every piece has a price. Enter the set price or the saving in percent, the other field follows. An empty row gets no discount.',
  },
});
