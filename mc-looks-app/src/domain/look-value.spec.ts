/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import fs from 'fs';
import path from 'path';
import { buildLookValue } from './look-value';

const schema = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      '../../../specs/001-looks-app/contracts/look-value.schema.json'
    ),
    'utf8'
  )
);

describe('look value', () => {
  it('only produces properties the contract schema allows, and all required ones', () => {
    const value = buildLookValue({
      componentProductIds: ['a', 'b'],
      setPrice: { EUR: 100 },
      endedAt: '2026-10-06T10:00:00.000Z',
    });
    for (const key of Object.keys(value))
      expect(Object.keys(schema.properties)).toContain(key);
    for (const key of schema.required) expect(value).toHaveProperty(key);
  });

  it('leaves endedAt out when absent', () => {
    expect(
      buildLookValue({ componentProductIds: ['a', 'b'], setPrice: { EUR: 1 } })
    ).toEqual({
      componentProductIds: ['a', 'b'],
      setPrice: { EUR: 1 },
    });
  });

  it('writes no image key, not even from an object that still has one', () => {
    const legacy = {
      componentProductIds: ['a', 'b'],
      setPrice: { EUR: 1 },
      image: { path: 'looks/x.webp', width: 10, height: 15 },
    };
    expect(buildLookValue(legacy)).not.toHaveProperty('image');
  });
});
