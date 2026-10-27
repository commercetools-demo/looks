import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Alert, Button, Stack, toast } from '@commercetools/nimbus';
import type { LookRow } from '../../domain/look-rows';
import { completeLook } from '../../domain/look-writes';
import { omitEmptyTranslations } from '../../domain/names';
import type { LocalizedValue } from '../../domain/types';
import { useCanManage, useLookApi } from '../../hooks/context';
import { describeError } from '../common/describe-error';
import { LookNameField } from '../common/look-name-field';
import commonMessages from '../common/messages';
import messages from './messages';

/** The warning for a half-written look and its repair. Completing never
 *  switches the look on. A look whose definition and discount disagree is
 *  only explained. */
export function CompleteLookPanel({
  row,
  onCompleted,
}: {
  row: LookRow;
  onCompleted: () => void;
}) {
  const intl = useIntl();
  const api = useLookApi();
  const canManage = useCanManage();
  const [label, setLabel] = useState<LocalizedValue>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const missingDiscount = row.completeness === 'missing-discount';
  const completable = missingDiscount || row.completeness === 'missing-object';
  const nameMissing =
    missingDiscount && Object.keys(omitEmptyTranslations(label)).length === 0;

  async function complete() {
    setBusy(true);
    setFailure(undefined);
    try {
      await completeLook(api, row, {
        liveSum: row.liveSum,
        ...(missingDiscount ? { label: omitEmptyTranslations(label) } : {}),
      });
      toast.success({ title: intl.formatMessage(messages.completed) });
      onCompleted();
    } catch (error) {
      setFailure(describeError(intl, error));
    } finally {
      setBusy(false);
    }
  }

  const description = !completable
    ? messages.completeInconsistent
    : missingDiscount
    ? messages.completeMissingDiscount
    : messages.completeMissingObject;
  const disabled = !canManage || busy;

  return (
    <Alert.Root colorPalette="warning">
      <Alert.Title>{intl.formatMessage(commonMessages.incomplete)}</Alert.Title>
      <Alert.Description>{intl.formatMessage(description)}</Alert.Description>
      {completable && (
        <Stack gap="300" mt="200">
          {missingDiscount && (
            <LookNameField
              label={intl.formatMessage(messages.completeName)}
              value={label}
              onChange={setLabel}
              isDisabled={disabled}
            />
          )}
          {failure && <Alert.Description>{failure}</Alert.Description>}
          <Alert.Actions>
            <Button
              size="xs"
              variant="solid"
              colorPalette="primary"
              isDisabled={disabled || nameMissing}
              onPress={() => void complete()}
            >
              {intl.formatMessage(messages.completeAction)}
            </Button>
          </Alert.Actions>
        </Stack>
      )}
    </Alert.Root>
  );
}
