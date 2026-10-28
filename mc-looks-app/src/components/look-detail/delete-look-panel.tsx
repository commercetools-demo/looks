import { useState, type FC } from 'react';
import { useIntl } from 'react-intl';
import {
  Alert,
  Button,
  Card,
  Flex,
  Heading,
  Stack,
  Text,
  toast,
} from '@commercetools/nimbus';
import { deleteLook } from '../../domain/look-writes';
import type { LookRow } from '../../domain/look-rows';
import { useCanManage, useLookApi } from '../../hooks/context';
import { describeError } from '../common/describe-error';
import { useLookTitle } from '../common/look-hooks';
import commonMessages from '../common/messages';
import messages from './messages';

type DeleteLookPanelProps = {
  row: LookRow;
  onDeleted: () => void;
  reload: () => void;
};

/**
 * Deleting a look: its definition, its country discounts and its Discount
 * Group, switched on or off. The user confirms first; for a look that is on
 * the confirmation says its discounts vanish from the shop at once.
 * Disabled, never hidden, without Manage.
 */
export const DeleteLookPanel: FC<DeleteLookPanelProps> = ({
  row,
  onDeleted,
  reload,
}) => {
  const intl = useIntl();
  const api = useLookApi();
  const canManage = useCanManage();
  const title = useLookTitle();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const name = title(row);

  async function remove() {
    setBusy(true);
    setFailure(undefined);
    try {
      await deleteLook(api, row);
      toast.success({ title: intl.formatMessage(messages.deleted, { name }) });
      onDeleted();
    } catch (error) {
      setFailure(describeError(intl, error));
      // Part of the look may be gone: show what is left.
      reload();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Card.Root>
      <Card.Body>
        <Stack gap="300">
          <Heading as="h2" size="md">
            {intl.formatMessage(messages.deleteTitle)}
          </Heading>
          <Text color="neutral.11">
            {intl.formatMessage(messages.deleteDescription)}
          </Text>
          {failure && (
            <Alert.Root colorPalette="critical">
              <Alert.Description>{failure}</Alert.Description>
            </Alert.Root>
          )}
          {confirming ? (
            <Alert.Root colorPalette="critical">
              <Alert.Title>
                {intl.formatMessage(messages.deleteConfirm, { name })}
              </Alert.Title>
              {row.isActive && (
                <Alert.Description>
                  {intl.formatMessage(messages.deleteActiveWarning)}
                </Alert.Description>
              )}
              <Alert.Actions>
                <Button
                  size="xs"
                  variant="solid"
                  colorPalette="critical"
                  isDisabled={busy || !canManage}
                  onPress={() => void remove()}
                >
                  {intl.formatMessage(messages.deleteConfirmButton)}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  isDisabled={busy}
                  onPress={() => setConfirming(false)}
                >
                  {intl.formatMessage(commonMessages.cancel)}
                </Button>
              </Alert.Actions>
            </Alert.Root>
          ) : (
            <Flex>
              <Button
                variant="outline"
                colorPalette="critical"
                isDisabled={busy || !canManage}
                onPress={() => setConfirming(true)}
              >
                {intl.formatMessage(messages.deleteButton)}
              </Button>
            </Flex>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
};
