/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { Stack, Text } from '@commercetools/nimbus';
import type { Piece } from '../../domain/types';
import {
  SetPriceTable,
  type PriceMode,
  type PriceTableState,
} from '../common/set-price-table';
import messages from './messages';

type SetPriceStepProps = {
  pieces: Piece[];
  texts: Record<string, string>;
  modes: Record<string, PriceMode>;
  onChange: (next: PriceTableState) => void;
  errors: Record<string, string | undefined>;
  /** Errors that belong to no row. */
  generalErrors: string[];
  isDisabled: boolean;
};

/** Step 3: the set-price table, one row per currency and country. */
export const SetPriceStep: FC<SetPriceStepProps> = (props) => {
  const intl = useIntl();
  return (
    <Stack gap="400">
      <Text color="neutral.11">
        {intl.formatMessage(messages.setPriceHeading)}
      </Text>
      {props.generalErrors.map((message) => (
        <Text key={message} color="critical.11" role="alert">
          {message}
        </Text>
      ))}
      <SetPriceTable
        pieces={props.pieces}
        texts={props.texts}
        modes={props.modes}
        onChange={props.onChange}
        errors={props.errors}
        isDisabled={props.isDisabled}
      />
    </Stack>
  );
};
