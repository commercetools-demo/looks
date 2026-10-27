import { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Button,
  Card,
  Flex,
  FormField,
  Heading,
  Stack,
  TextInput,
  toast,
} from '@commercetools/nimbus';
import { config } from '../../config';
import { changePhoto } from '../../domain/look-writes';
import type { LookRow } from '../../domain/look-rows';
import { isLookImagePath, lookImageUrl } from '../../domain/look-value';
import type { LookObject } from '../../domain/types';
import { useCanManage, useLookApi } from '../../hooks/context';
import { describeError } from '../common/describe-error';
import { measureImage, type ImageLoader } from './measure-image';
import messages from './messages';

/** Sets or clears the look photo. The path is checked and the file loaded
 *  from the shop first, so a photo that cannot show is never stored. */
export function PhotoForm({
  row,
  apply,
  loadImage = measureImage,
}: {
  row: LookRow;
  apply: (discount?: undefined, object?: LookObject) => void;
  loadImage?: ImageLoader;
}) {
  const intl = useIntl();
  const api = useLookApi();
  const canManage = useCanManage();
  const [path, setPath] = useState(row.image?.path ?? '');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const noShop = !config.shopOrigin;

  async function save() {
    const value = path.trim();
    setError(undefined);
    setBusy(true);
    try {
      let image;
      if (value) {
        if (!isLookImagePath(value)) {
          setError(intl.formatMessage(messages.photoInvalid));
          return;
        }
        const url = lookImageUrl(value, config.shopOrigin) as string;
        const size = await loadImage(url).catch(() => undefined);
        if (!size || !(size.width > 0) || !(size.height > 0)) {
          setError(intl.formatMessage(messages.photoUnloadable));
          return;
        }
        image = { path: value, width: size.width, height: size.height };
      }
      const result = await changePhoto(api, row.objectKey, image);
      apply(undefined, result.object);
      toast.success({ title: intl.formatMessage(messages.photoSaved) });
    } catch (failure) {
      setError(describeError(intl, failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card.Root>
      <Card.Body>
        <Stack gap="300">
          <Heading as="h2" size="md">
            {intl.formatMessage(messages.photoTitle)}
          </Heading>
          <FormField.Root
            isInvalid={Boolean(error)}
            isDisabled={!canManage || noShop || busy}
          >
            <FormField.Label>
              {intl.formatMessage(messages.photoLabel)}
            </FormField.Label>
            <FormField.Input>
              <TextInput
                aria-label={intl.formatMessage(messages.photoLabel)}
                value={path}
                onChange={setPath}
              />
            </FormField.Input>
            <FormField.Description>
              {intl.formatMessage(
                noShop ? messages.photoNoShop : messages.photoHelp
              )}
            </FormField.Description>
            {error && <FormField.Error>{error}</FormField.Error>}
          </FormField.Root>
          <Flex>
            <Button
              variant="solid"
              colorPalette="primary"
              isDisabled={!canManage || noShop || busy}
              onPress={() => void save()}
            >
              {intl.formatMessage(messages.photoSave)}
            </Button>
          </Flex>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
