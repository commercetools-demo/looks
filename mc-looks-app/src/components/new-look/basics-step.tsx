/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { FC } from 'react';
import { useIntl } from 'react-intl';
import {
  Button,
  Flex,
  FormField,
  PageContent,
  TextInput,
} from '@commercetools/nimbus';
import { LookNameField } from '../common/look-name-field';
import { lookObjectKey } from '../../domain/keys';
import type { LocalizedValue } from '../../domain/types';
import messages from './messages';

type BasicsStepProps = {
  label: LocalizedValue;
  onLabelChange: (label: LocalizedValue) => void;
  description: LocalizedValue;
  onDescriptionChange: (description: LocalizedValue) => void;
  nameError: string | undefined;
  /** The key shown in the field: the one the user typed, else the suggestion. */
  keyValue: string;
  keyIsCustom: boolean;
  onKeyChange: (key: string) => void;
  onKeyReset: () => void;
  keyError: string | undefined;
  isDisabled: boolean;
};

/** Step 1: the name and the optional description in the project languages,
 *  the look key and the optional look photo. */
export const BasicsStep: FC<BasicsStepProps> = (props) => {
  const intl = useIntl();
  const { label, nameError } = props;
  return (
    <PageContent.Root variant="narrow">
      <Flex direction="column" gap="400">
        <LookNameField
          label={intl.formatMessage(messages.name)}
          value={label}
          onChange={props.onLabelChange}
          error={nameError}
          isDisabled={props.isDisabled}
        />
        <LookNameField
          label={intl.formatMessage(messages.description)}
          description={intl.formatMessage(messages.descriptionHelp)}
          value={props.description}
          onChange={props.onDescriptionChange}
          isDisabled={props.isDisabled}
          multiLine
          isOptional
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
      </Flex>
    </PageContent.Root>
  );
};
