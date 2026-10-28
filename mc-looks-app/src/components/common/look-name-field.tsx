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
};

/**
 * The look name: one input per project language (Nimbus `LocalizedField`),
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
}) => {
  const languages = useLanguages();
  const dataLocale = useDataLocale();
  const defaultLocale = languages.includes(dataLocale)
    ? dataLocale
    : languages[0];
  return (
    <LocalizedField
      type="text"
      label={label}
      description={description}
      isRequired
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
