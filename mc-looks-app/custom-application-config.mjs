/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { PERMISSIONS } from './src/constants';

/**
 * @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication}
 */
const config = {
  name: 'Looks',
  description: 'Curated looks: look definition and set-price discount',
  entryPointUriPath: '${env:ENTRY_POINT_URI_PATH}',
  cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
  env: {
    development: {
      initialProjectKey: '${env:INITIAL_PROJECT_KEY}',
    },
    production: {
      applicationId: '${env:CUSTOM_APPLICATION_ID}',
      url: '${env:APPLICATION_URL}',
    },
  },
  // The scopes are exactly the ones the spec names (FR-080); the registration
  // in the Merchant Center must carry the same list.
  oAuthScopes: {
    view: [
      'view_products',
      'view_key_value_documents',
      'view_cart_discounts',
      'view_orders',
      'view_project_settings',
    ],
    manage: ['manage_key_value_documents', 'manage_cart_discounts'],
  },
  icon: '${path:@commercetools-frontend/assets/application-icons/star.svg}',
  mainMenuLink: {
    defaultLabel: 'Looks',
    labelAllLocales: [
      { locale: 'de', value: 'Looks' },
      { locale: 'en', value: 'Looks' },
    ],
    permissions: [PERMISSIONS.View],
  },
  submenuLinks: [],
};

export default config;
