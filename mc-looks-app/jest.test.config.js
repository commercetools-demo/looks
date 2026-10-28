/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

process.env.ENABLE_NEW_JSX_TRANSFORM = 'true';

/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  preset: '@commercetools-frontend/jest-preset-mc-app/typescript',
  // Jest concatenates `setupFiles` from the preset with these, so the preset's
  // own setup (raf/polyfill, jest-localstorage-mock, …) is preserved.
  setupFiles: ['<rootDir>/jest.setup.nimbus.js'],
  // Wraps the preset's resolver and fixes Nimbus' faulty CJS `.cjs.js` requires.
  resolver: '<rootDir>/jest.resolver.js',
  // `uuid` is ESM only; see the stub for why a stand-in is enough in tests.
  moduleNameMapper: { '^uuid$': '<rootDir>/jest.uuid-stub.js' },
};
