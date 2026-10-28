/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import fs from 'fs';
import path from 'path';

/**
 * `mc-scripts` compiles JSX with the classic runtime (`React.createElement`)
 * unless `ENABLE_NEW_JSX_TRANSFORM` is `true`. The components do not import
 * React, so without the flag the build still succeeds but the app fails in the
 * browser with "React is not defined". The flag lives in the tracked `.env`.
 */
describe('build flags in the tracked .env', () => {
  const env = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');

  it('enables the new JSX transform', () => {
    expect(env).toMatch(/^ENABLE_NEW_JSX_TRANSFORM="?true"?$/m);
  });

  it('holds no secret: only the build flags and the entry point path', () => {
    const names = env
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
      .map((line) => line.split('=')[0])
      .sort();
    expect(names).toEqual([
      'ENABLE_NEW_JSX_TRANSFORM',
      'ENTRY_POINT_URI_PATH',
      'FAST_REFRESH',
    ]);
  });
});
