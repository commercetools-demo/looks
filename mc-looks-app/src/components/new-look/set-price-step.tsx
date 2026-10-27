import { useIntl } from 'react-intl';
import { Stack, Text } from '@commercetools/nimbus';
import type { Piece } from '../../domain/types';
import { SetPriceTable } from '../common/set-price-table';
import messages from './messages';

/** Step 3: the set-price table, one row per currency and country. */
export function SetPriceStep(props: {
  pieces: Piece[];
  texts: Record<string, string>;
  onTextsChange: (texts: Record<string, string>) => void;
  errors: Record<string, string | undefined>;
  /** Errors that belong to no row. */
  generalErrors: string[];
  isDisabled: boolean;
}) {
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
        onTextsChange={props.onTextsChange}
        errors={props.errors}
        isDisabled={props.isDisabled}
      />
    </Stack>
  );
}
