import { useIntl } from 'react-intl';
import {
  Box,
  Flex,
  FormField,
  Stack,
  Text,
  TextInput,
} from '@commercetools/nimbus';
import { LookPhoto } from '../common/look-photo';
import type { PhotoCheck } from '../../hooks/use-photo-check';
import messages from './messages';

/** Width of the photo shown next to the form. */
export const STEP1_PHOTO_WIDTH = 120;

/** Step 1: names in German and English and the optional look photo. */
export function BasicsStep(props: {
  label: { de: string; en: string };
  onLabelChange: (label: { de: string; en: string }) => void;
  nameErrors: { de?: string; en?: string };
  photoPath: string;
  onPhotoPathChange: (path: string) => void;
  photoError: string | undefined;
  photo: PhotoCheck;
  /** Without a shop address the photo cannot be checked. */
  photoAvailable: boolean;
  isDisabled: boolean;
}) {
  const intl = useIntl();
  const { label, nameErrors } = props;
  return (
    <Flex gap="800" alignItems="flex-start" wrap="wrap">
      <Stack gap="500" maxWidth="520px" flex="1" minWidth="280px">
        <FormField.Root
          isRequired
          isDisabled={props.isDisabled}
          isInvalid={Boolean(nameErrors.de)}
        >
          <FormField.Label>
            {intl.formatMessage(messages.nameDe)}
          </FormField.Label>
          <FormField.Input>
            <TextInput
              aria-label={intl.formatMessage(messages.nameDe)}
              value={label.de}
              onChange={(de) => props.onLabelChange({ ...label, de })}
            />
          </FormField.Input>
          {nameErrors.de && <FormField.Error>{nameErrors.de}</FormField.Error>}
        </FormField.Root>
        <FormField.Root
          isRequired
          isDisabled={props.isDisabled}
          isInvalid={Boolean(nameErrors.en)}
        >
          <FormField.Label>
            {intl.formatMessage(messages.nameEn)}
          </FormField.Label>
          <FormField.Input>
            <TextInput
              aria-label={intl.formatMessage(messages.nameEn)}
              value={label.en}
              onChange={(en) => props.onLabelChange({ ...label, en })}
            />
          </FormField.Input>
          <FormField.Description>
            {intl.formatMessage(messages.nameHelp)}
          </FormField.Description>
          {nameErrors.en && <FormField.Error>{nameErrors.en}</FormField.Error>}
        </FormField.Root>
        <FormField.Root
          isDisabled={props.isDisabled || !props.photoAvailable}
          isInvalid={Boolean(props.photoError)}
        >
          <FormField.Label>
            {intl.formatMessage(messages.photoLabel)}{' '}
            <Text as="span" fontWeight="400" color="neutral.11">
              {intl.formatMessage(messages.photoOptional)}
            </Text>
          </FormField.Label>
          <FormField.Input>
            <TextInput
              aria-label={intl.formatMessage(messages.photoLabel)}
              placeholder={intl.formatMessage(messages.photoPlaceholder)}
              value={props.photoPath}
              onChange={props.onPhotoPathChange}
            />
          </FormField.Input>
          <FormField.Description>
            {intl.formatMessage(
              props.photoAvailable ? messages.photoHelp : messages.photoNoShop
            )}
          </FormField.Description>
          {props.photoError && (
            <FormField.Error>{props.photoError}</FormField.Error>
          )}
        </FormField.Root>
      </Stack>
      {props.photo.status === 'ready' &&
        props.photo.url &&
        props.photo.image && (
          <Box pt="600" data-testid="step1-photo">
            <LookPhoto
              src={props.photo.url}
              alt={intl.formatMessage(messages.photoAlt)}
              width={STEP1_PHOTO_WIDTH}
              ratio={{ width: 2, height: 3 }}
            />
          </Box>
        )}
    </Flex>
  );
}
