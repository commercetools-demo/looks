import { useIntl } from 'react-intl';
import { Flex, FormField, Stack, Text, TextInput } from '@commercetools/nimbus';
import { savingPercent } from '../../domain/prices';
import type { Money } from '../../domain/types';
import { useCurrencies } from '../../hooks/context';
import { useMoney } from '../common/look-hooks';
import messages from './messages';

/** Step 3: one amount per project currency, each with the live sum and the
 *  saving against it. */
export function SetPriceStep(props: {
  texts: Record<string, string>;
  onTextsChange: (texts: Record<string, string>) => void;
  sum: Money;
  cents: Money;
  errors: Record<string, string | undefined>;
  isDisabled: boolean;
}) {
  const intl = useIntl();
  const money = useMoney();
  const currencies = useCurrencies();
  return (
    <Stack gap="500" maxWidth="640px">
      <Text color="neutral.11">
        {intl.formatMessage(messages.setPriceHeading)}
      </Text>
      {currencies.map((currency) => {
        const sum = props.sum[currency];
        const set = props.cents[currency];
        const percent = set > 0 ? savingPercent(sum, set) : undefined;
        const label = intl.formatMessage(messages.setPriceLabel, { currency });
        return (
          <FormField.Root
            key={currency}
            isDisabled={props.isDisabled}
            isInvalid={Boolean(props.errors[currency])}
          >
            <FormField.Label>{label}</FormField.Label>
            <FormField.Input>
              <TextInput
                aria-label={label}
                inputMode="decimal"
                value={props.texts[currency] ?? ''}
                onChange={(value) =>
                  props.onTextsChange({ ...props.texts, [currency]: value })
                }
              />
            </FormField.Input>
            <FormField.Description>
              <Flex
                gap="300"
                wrap="wrap"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                <span>
                  {intl.formatMessage(messages.setPriceSum, {
                    currency,
                    sum: money(sum, currency),
                  })}
                </span>
                {sum !== undefined && percent !== undefined && sum > set && (
                  <span>
                    {intl.formatMessage(messages.setPriceSaving, {
                      amount: money(sum - set, currency),
                      percent,
                    })}
                  </span>
                )}
              </Flex>
            </FormField.Description>
            {props.errors[currency] && (
              <FormField.Error>{props.errors[currency]}</FormField.Error>
            )}
          </FormField.Root>
        );
      })}
    </Stack>
  );
}
