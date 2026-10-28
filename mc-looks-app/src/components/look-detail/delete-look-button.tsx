import { useState, type FC } from 'react';
import { useIntl } from 'react-intl';
import { Delete } from '@commercetools/nimbus-icons';
import {
  ConfirmationDialog,
  Icon,
  IconButton,
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

type DeleteLookButtonProps = {
  row: LookRow;
  onDeleted: () => void;
  reload: () => void;
};

/**
 * Deleting a look from the page header (a trash icon button): its definition, its country
 * discounts and its Discount Group, switched on or off. A Nimbus confirmation
 * dialog asks first; for a look that is on it says its discounts vanish from
 * the shop at once. Disabled, never hidden, without Manage.
 */
export const DeleteLookButton: FC<DeleteLookButtonProps> = ({
  row,
  onDeleted,
  reload,
}) => {
  const intl = useIntl();
  const api = useLookApi();
  const canManage = useCanManage();
  const title = useLookTitle();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = title(row);

  async function remove() {
    setBusy(true);
    try {
      await deleteLook(api, row);
      toast.success({ title: intl.formatMessage(messages.deleted, { name }) });
      setIsOpen(false);
      onDeleted();
    } catch (error) {
      toast.error({ title: describeError(intl, error) });
      // Part of the look may be gone: show what is left.
      setIsOpen(false);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <IconButton
        variant="ghost"
        colorPalette="primary"
        aria-label={intl.formatMessage(messages.deleteButton)}
        title={intl.formatMessage(messages.deleteButton)}
        isDisabled={busy || !canManage}
        onPress={() => setIsOpen(true)}
      >
        <Icon>
          <Delete />
        </Icon>
      </IconButton>
      <ConfirmationDialog
        title={intl.formatMessage(messages.deleteConfirm, { name })}
        intent="destructive"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        isConfirmLoading={busy}
        confirmLabel={intl.formatMessage(messages.deleteConfirmButton)}
        cancelLabel={intl.formatMessage(commonMessages.cancel)}
        onConfirm={remove}
        onCancel={() => setIsOpen(false)}
      >
        <Stack gap="200">
          <Text>{intl.formatMessage(messages.deleteDescription)}</Text>
          {row.isActive && (
            <Text color="critical.11">
              {intl.formatMessage(messages.deleteActiveWarning)}
            </Text>
          )}
        </Stack>
      </ConfirmationDialog>
    </>
  );
};
