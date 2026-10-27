import { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Alert,
  Button,
  FormField,
  Stack,
  TextInput,
  toast,
} from '@commercetools/nimbus';
import type { LookRow } from '../../domain/look-rows';
import { completeLook } from '../../domain/look-writes';
import { useCanManage, useLookApi } from '../../hooks/context';
import { describeError } from '../common/describe-error';
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
  const [label, setLabel] = useState({ de: '', en: '' });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const missingDiscount = row.completeness === 'missing-discount';
  const completable = missingDiscount || row.completeness === 'missing-object';
  const namesMissing =
    missingDiscount && (!label.de.trim() || !label.en.trim());

  async function complete() {
    setBusy(true);
    setFailure(undefined);
    try {
      await completeLook(api, row, {
        liveSum: row.liveSum,
        ...(missingDiscount
          ? { label: { de: label.de.trim(), en: label.en.trim() } }
          : {}),
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
          {missingDiscount &&
            (['de', 'en'] as const).map((locale) => {
              const text = intl.formatMessage(
                locale === 'de'
                  ? messages.completeNameDe
                  : messages.completeNameEn
              );
              return (
                <FormField.Root key={locale} isDisabled={disabled}>
                  <FormField.Label>{text}</FormField.Label>
                  <FormField.Input>
                    <TextInput
                      aria-label={text}
                      value={label[locale]}
                      onChange={(value) =>
                        setLabel((current) => ({ ...current, [locale]: value }))
                      }
                    />
                  </FormField.Input>
                </FormField.Root>
              );
            })}
          {failure && <Alert.Description>{failure}</Alert.Description>}
          <Alert.Actions>
            <Button
              size="xs"
              variant="solid"
              colorPalette="primary"
              isDisabled={disabled || namesMissing}
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
