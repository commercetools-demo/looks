import type { FC } from 'react';
import { Stack, Text } from '@commercetools/nimbus';
import { useCurrencies } from '../../hooks/context';
import { useMoney } from './look-hooks';

type MoneyLinesProps = {
  value: Record<string, number> | undefined;
  strong?: boolean;
  align?: 'flex-start' | 'flex-end';
};

/** One line per project currency; the first (default) currency in the text
 *  weight, the others smaller and grey. Right-aligned for amount columns. */
export const MoneyLines: FC<MoneyLinesProps> = ({
  value,
  strong = false,
  align = 'flex-end',
}) => {
  const currencies = useCurrencies();
  const money = useMoney();
  return (
    <Stack
      gap="0"
      alignItems={align}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {currencies.map((currency, index) => (
        <Text
          key={currency}
          whiteSpace="nowrap"
          fontWeight={index === 0 && strong ? '500' : undefined}
          fontSize={index === 0 ? undefined : '300'}
          color={index === 0 ? undefined : 'neutral.11'}
        >
          {money(value?.[currency], currency)}
        </Text>
      ))}
    </Stack>
  );
};
