import type { ReactNode } from 'react';
import { LocalizedField } from '@commercetools/nimbus';
import { useDataLocale, useLanguages } from '../../hooks/context';
import type { LocalizedValue } from '../../domain/types';

/**
 * The look name: one input per project language (Nimbus `LocalizedField`),
 * the data locale shown first and the other languages behind the toggle.
 * Empty translations are dropped by the caller (`omitEmptyTranslations`).
 */
export function LookNameField({
  label,
  description,
  value,
  onChange,
  error,
  isDisabled,
}: {
  label: ReactNode;
  description?: ReactNode;
  value: LocalizedValue;
  onChange: (value: LocalizedValue) => void;
  error?: string;
  isDisabled?: boolean;
}) {
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
}
