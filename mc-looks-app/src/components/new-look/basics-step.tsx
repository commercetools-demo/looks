import { useIntl } from 'react-intl';
import {
  Box,
  Button,
  Flex,
  FormField,
  Stack,
  Text,
  TextInput,
} from '@commercetools/nimbus';
import { LookNameField } from '../common/look-name-field';
import { LookPhoto } from '../common/look-photo';
import { lookObjectKey } from '../../domain/keys';
import type { LocalizedValue } from '../../domain/types';
import type { PhotoCheck } from '../../hooks/use-photo-check';
import messages from './messages';

/** Width of the photo shown next to the form. */
export const STEP1_PHOTO_WIDTH = 120;

/** Step 1: the name in the project languages, the look key and the optional
 *  look photo. */
export function BasicsStep(props: {
  label: LocalizedValue;
  onLabelChange: (label: LocalizedValue) => void;
  nameError: string | undefined;
  /** The key shown in the field: the one the user typed, else the suggestion. */
  keyValue: string;
  keyIsCustom: boolean;
  onKeyChange: (key: string) => void;
  onKeyReset: () => void;
  keyError: string | undefined;
  photoPath: string;
  onPhotoPathChange: (path: string) => void;
  photoError: string | undefined;
  photo: PhotoCheck;
  /** Without a shop address the photo cannot be checked. */
  photoAvailable: boolean;
  isDisabled: boolean;
}) {
  const intl = useIntl();
  const { label, nameError } = props;
  return (
    <Flex gap="800" alignItems="flex-start" wrap="wrap">
      <Stack gap="500" maxWidth="520px" flex="1" minWidth="280px">
        <LookNameField
          label={intl.formatMessage(messages.name)}
          description={intl.formatMessage(messages.nameHelp)}
          value={label}
          onChange={props.onLabelChange}
          error={nameError}
          isDisabled={props.isDisabled}
        />
        <FormField.Root
          isDisabled={props.isDisabled}
          isInvalid={Boolean(props.keyError)}
        >
          <FormField.Label>
            {intl.formatMessage(messages.keyLabel)}
          </FormField.Label>
          <FormField.Input>
            <TextInput
              aria-label={intl.formatMessage(messages.keyLabel)}
              value={props.keyValue}
              onChange={props.onKeyChange}
              width={'full'}
            />
          </FormField.Input>
          <FormField.Description>
            {props.keyValue.trim()
              ? intl.formatMessage(messages.keyHelp, {
                  fullKey: lookObjectKey(props.keyValue.trim()),
                })
              : intl.formatMessage(messages.keyHelpEmpty)}
          </FormField.Description>
          {props.keyError && (
            <FormField.Error>{props.keyError}</FormField.Error>
          )}
          {props.keyIsCustom && (
            <Button
              size="2xs"
              variant="link"
              isDisabled={props.isDisabled}
              onPress={props.onKeyReset}
            >
              {intl.formatMessage(messages.keyReset)}
            </Button>
          )}
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
              width={'full'}
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
