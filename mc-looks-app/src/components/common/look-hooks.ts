/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useIntl } from 'react-intl';
import { formatMoney, localized } from '../../domain/format';
import type { LookRow } from '../../domain/look-rows';
import { useDataLocale } from '../../hooks/context';
import messages from './messages';

/** Money text in the user's display locale, or "nicht verfügbar". */
export function useMoney() {
  const intl = useIntl();
  return (cents: number | undefined, currency: string) =>
    cents === undefined
      ? intl.formatMessage(messages.noValue)
      : formatMoney(cents, currency, intl.locale);
}

/**
 * The look name the list, the detail and the cards share: read in the
 * Merchant Center's data locale (not the user's profile language), falling
 * back to de, en, the first language, then the key.
 */
export function useLookTitle() {
  const intl = useIntl();
  const dataLocale = useDataLocale();
  return (row: Pick<LookRow, 'name' | 'lookKey'>) =>
    localized(row.name, dataLocale) ??
    intl.formatMessage(messages.unnamedLook, { key: row.lookKey });
}
