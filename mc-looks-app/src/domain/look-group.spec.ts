/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { createFakeLookApi } from '../test-utils/fake-look-api';
import { buildDiscount } from '../test-utils/fixtures';
import { ensureLookGroup } from './look-group';

const look = { key: 'x', label: { de: 'Mein Look', en: 'My look' } };

describe('ensureLookGroup', () => {
  it('returns the existing group of the look without creating or reading ranks', async () => {
    const fake = createFakeLookApi({
      groups: [
        {
          id: 'g-old',
          version: 4,
          key: 'look-x',
          sortOrder: '0.7',
          isActive: true,
        },
      ],
    });
    const group = await ensureLookGroup(fake.api, look, false);
    expect(group).toMatchObject({ id: 'g-old', version: 4, isActive: true });
    expect(fake.callsTo('createDiscountGroup')).toHaveLength(0);
    expect(fake.callsTo('fetchCartDiscounts')).toHaveLength(0);
  });

  it('creates a missing group with the given state and the name of the look', async () => {
    const fake = createFakeLookApi();
    const group = await ensureLookGroup(fake.api, look, true);
    expect(group).toMatchObject({
      key: 'look-x',
      sortOrder: '0.7',
      isActive: true,
    });
    expect(fake.callsTo('createDiscountGroup')[0].args[0]).toEqual({
      key: 'look-x',
      sortOrder: '0.7',
      isActive: true,
      name: [
        { locale: 'de', value: 'Mein Look' },
        { locale: 'en', value: 'My look' },
      ],
    });
  });

  it('forwards the description of the look to the created group', async () => {
    const fake = createFakeLookApi();
    await ensureLookGroup(
      fake.api,
      { ...look, description: { de: 'Gemütlich', en: 'Cosy' } },
      false
    );
    expect(fake.callsTo('createDiscountGroup')[0].args[0]).toMatchObject({
      name: [
        { locale: 'de', value: 'Mein Look' },
        { locale: 'en', value: 'My look' },
      ],
      description: [
        { locale: 'de', value: 'Gemütlich' },
        { locale: 'en', value: 'Cosy' },
      ],
    });
  });

  it('takes the lowest rank free among the cart discounts AND the groups', async () => {
    const fake = createFakeLookApi({
      discounts: [buildDiscount('a', ['p'], { sortOrder: '0.7' })],
      groups: [
        {
          id: 'g1',
          version: 1,
          key: 'look-b',
          sortOrder: '0.7001',
          isActive: true,
        },
      ],
    });
    const group = await ensureLookGroup(fake.api, look, false);
    expect(group.sortOrder).toBe('0.7002');
  });
});
