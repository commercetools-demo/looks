/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  isConflict,
  isDuplicate,
  LookApiError,
  toLookApiError,
} from './errors';

const gql = (code: string, message = 'boom') => ({
  graphQLErrors: [{ message, extensions: { code } }],
});

describe('toLookApiError', () => {
  it.each([
    ['ConcurrentModification', 'conflict', 409],
    ['DuplicateField', 'duplicate', 400],
    ['InsufficientScope', 'forbidden', 403],
    ['MaxCartDiscountsReached', 'limit', undefined],
  ])('maps %s to %s', (code, kind, status) => {
    const error = toLookApiError('switchDiscount', gql(code));
    expect(error).toBeInstanceOf(LookApiError);
    expect(error.kind).toBe(kind);
    expect(error.statusCode).toBe(status);
    expect(error.operation).toBe('switchDiscount');
    expect(error.code).toBe(code);
  });

  it('maps network errors and unknown ones, keeping the message', () => {
    expect(
      toLookApiError('readLooks', { networkError: new Error('x') }).kind
    ).toBe('network');
    const unknown = toLookApiError('readLooks', new Error('oops'));
    expect(unknown.kind).toBe('unknown');
    expect(unknown.message).toBe('oops');
  });

  it('does not wrap twice and offers predicates', () => {
    const once = toLookApiError('readLooks', gql('ConcurrentModification'));
    expect(toLookApiError('readProducts', once)).toBe(once);
    expect(isConflict(once)).toBe(true);
    expect(isDuplicate(once)).toBe(false);
    expect(isConflict(new Error('x'))).toBe(false);
  });
});
