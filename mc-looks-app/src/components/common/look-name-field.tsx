import type { FC, ReactNode } from 'react';
import { LocalizedField } from '@commercetools/nimbus';
import { useDataLocale, useLanguages } from '../../hooks/context';
import type { LocalizedValue } from '../../domain/types';

type LookNameFieldProps = {
  label: ReactNode;
  description?: ReactNode;
  value: LocalizedValue;
  onChange: (value: LocalizedValue) => void;
  error?: string;
  isDisabled?: boolean;
  /** A multi-line input per language (the description). */
  multiLine?: boolean;
  /** Not required (the description). */
  isOptional?: boolean;
};

/**
 * The look name or description: one input per project language (Nimbus `LocalizedField`),
 * the data locale shown first and the other languages behind the toggle.
 * Empty translations are dropped by the caller (`omitEmptyTranslations`).
 */
export const LookNameField: FC<LookNameFieldProps> = ({
  label,
  description,
  value,
  onChange,
  error,
  isDisabled,
  multiLine = false,
  isOptional = false,
}) => {
  const languages = useLanguages();
  const dataLocale = useDataLocale();
  const defaultLocale = languages.includes(dataLocale)
    ? dataLocale
    : languages[0];
  return (
    <LocalizedField
      type={multiLine ? 'multiLine' : 'text'}
      label={label}
      description={description}
      isRequired={!isOptional}
      isDisabled={isDisabled}
      defaultLocaleOrCurrency={defaultLocale}
      valuesByLocaleOrCurrency={LocalizedField.createLocalizedString(
        languages,
        value
      )}
      error={error}
      touched={Boolean(error)}
      onChange={(event) => {
        const { locale, value: text } = event.target;
        if (locale) onChange({ ...value, [locale]: String(text ?? '') });
      }}
      width={'full'}
    />
  );
};
