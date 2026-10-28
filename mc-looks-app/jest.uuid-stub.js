/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// `uuid` 14 ships ESM only, which Jest cannot load through the application
// shell's connectors. Tests only need random ids, so a CommonJS stand-in is
// enough (production bundles use the real package).
const crypto = require('crypto');

module.exports = {
  v1: () => crypto.randomUUID(),
  v4: () => crypto.randomUUID(),
  validate: () => true,
  version: () => 4,
  NIL: '00000000-0000-0000-0000-000000000000',
};
