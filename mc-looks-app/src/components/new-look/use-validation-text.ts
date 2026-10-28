import { useIntl } from 'react-intl';
import { LOOK_MIN_PIECES } from '../../domain/limits';
import type { ValidationError } from '../../domain/validate';
import type { Money } from '../../domain/types';
import { splitPriceKey } from '../../domain/prices';
import { useMoney } from '../common/look-hooks';
import messages from './messages';

export interface ValidationContext {
  pieceName: (productId: string) => string;
  liveSum: Money;
  pieceCount: number;
}

/** One sentence per `validateLook` error. */
export function useValidationText() {
  const intl = useIntl();
  const money = useMoney();
  return (error: ValidationError, context: ValidationContext): string => {
    const piece = error.productId ? context.pieceName(error.productId) : '';
    const currency = error.currency ?? '';
    switch (error.code) {
      case 'name-missing':
        return intl.formatMessage(messages.errorName);
      case 'pieces-count':
        return intl.formatMessage(messages.errorPiecesMin, {
          min: LOOK_MIN_PIECES,
          count: context.pieceCount,
        });
      case 'piece-duplicate':
        return intl.formatMessage(messages.errorDuplicate, { piece });
      case 'set-price-none':
        return intl.formatMessage(messages.errorPriceNone);
      case 'set-price-not-positive':
        return intl.formatMessage(messages.errorNotPositive, { currency });
      case 'set-price-not-below-sum':
        return intl.formatMessage(messages.errorNotBelowSum, {
          currency,
          sum: money(
            context.liveSum[currency],
            splitPriceKey(currency).currency
          ),
        });
      case 'sum-not-live':
        return intl.formatMessage(messages.errorSumChanged, { currency });
      case 'saving-percent-invalid':
        return intl.formatMessage(messages.errorPercentInvalid, { currency });
      case 'discount-mode-mixed':
        return intl.formatMessage(messages.errorModeMixed, { currency });
      case 'key-invalid':
        return intl.formatMessage(messages.errorKeyInvalid);
    }
  };
}
