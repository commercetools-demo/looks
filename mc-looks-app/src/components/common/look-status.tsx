import { useState, type FC } from 'react';
import { useIntl } from 'react-intl';
import { Badge, Flex, Switch, toast } from '@commercetools/nimbus';
import type { LookRow } from '../../domain/look-rows';
import { switchLook } from '../../domain/look-writes';
import type { LookDiscount, LookObject } from '../../domain/types';
import { useCanManage, useLookApi } from '../../hooks/context';
import { describeError } from './describe-error';
import { useLookTitle } from './look-hooks';
import messages from './messages';

type LookStatusBadgesProps = { row: LookRow };

/** Status of a look: active or inactive (from the discount), plus the
 *  "Unvollständig" and "Setpreis weicht ab" warnings. */
export const LookStatusBadges: FC<LookStatusBadgesProps> = ({ row }) => {
  const intl = useIntl();
  return (
    <Flex as="span" gap="100" wrap="wrap">
      <Badge size="xs" colorPalette={row.isActive ? 'positive' : 'neutral'}>
        {intl.formatMessage(
          row.isActive ? messages.statusActive : messages.statusInactive
        )}
      </Badge>
      {row.completeness !== 'complete' && (
        <Badge size="xs" colorPalette="warning">
          {intl.formatMessage(messages.incomplete)}
        </Badge>
      )}
      {row.priceDrift && (
        <Badge size="xs" colorPalette="warning">
          {intl.formatMessage(messages.priceDrift)}
        </Badge>
      )}
    </Flex>
  );
};

type LookStatusSwitchProps = {
  row: LookRow;
  onChange: (
    discount: LookDiscount,
    object?: LookObject,
    more?: LookDiscount[]
  ) => void;
};

/**
 * The status `Switch` of a look (list row, detail, past-look card). It sets
 * the discount's `isActive` with the discount's current `version`; on a
 * conflict it shows the re-read state and says so, without retrying. It is
 * only offered for a complete look; without Manage it is rendered disabled,
 * never hidden. `onChange` receives the discount (and object) as written.
 */
export const LookStatusSwitch: FC<LookStatusSwitchProps> = ({
  row,
  onChange,
}) => {
  const api = useLookApi();
  const intl = useIntl();
  const canManage = useCanManage();
  const title = useLookTitle();
  const [busy, setBusy] = useState(false);
  if (row.completeness !== 'complete' || !row.discount) return null;
  const discount = row.discount;
  const name = title(row);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      const result = await switchLook(api, discount, next, {
        objectKey: row.objectKey,
        countryDiscounts: row.countryDiscounts,
      });
      onChange(result.discount, result.object, result.countryDiscounts);
      if (result.outcome === 'conflict') {
        toast.warning({ title: intl.formatMessage(messages.switchConflict) });
      } else {
        toast.success({
          title: intl.formatMessage(
            next ? messages.switchedOn : messages.switchedOff,
            { name }
          ),
        });
      }
    } catch (error) {
      toast.error({ title: describeError(intl, error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Switch
      size="md"
      isSelected={row.isActive}
      isDisabled={busy || !canManage}
      aria-label={intl.formatMessage(messages.switchLabel, { name })}
      onChange={(next) => void toggle(next)}
    />
  );
};
