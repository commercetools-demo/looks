import type { IntlShape } from 'react-intl';
import { LookApiError, type Operation } from '../../domain/errors';
import { SortOrderExhaustedError } from '../../domain/sort-order';
import messages from './messages';

const operationMessages: Record<Operation, keyof typeof messages> = {
  readProject: 'opReadProject',
  readLooks: 'opReadLooks',
  readProducts: 'opReadProducts',
  searchProducts: 'opSearchProducts',
  readOrders: 'opReadOrders',
  createDiscount: 'opCreateDiscount',
  activateDiscount: 'opActivateDiscount',
  switchDiscount: 'opSwitchDiscount',
  changeDiscountValue: 'opChangeDiscountValue',
  completeDiscount: 'opCompleteDiscount',
  writeLookObject: 'opWriteLookObject',
};

/** A readable message for an API failure that names the failed operation. */
export function describeError(intl: IntlShape, error: unknown): string {
  if (error instanceof SortOrderExhaustedError) {
    return intl.formatMessage(messages.errorSortOrderExhausted);
  }
  if (!(error instanceof LookApiError)) {
    return intl.formatMessage(messages.errorGeneric, {
      operation: intl.formatMessage(messages.opReadLooks),
      message: error instanceof Error ? error.message : String(error),
    });
  }
  const operation = intl.formatMessage(
    messages[operationMessages[error.operation]]
  );
  switch (error.kind) {
    case 'forbidden':
      return intl.formatMessage(messages.errorForbidden, { operation });
    case 'conflict':
      return intl.formatMessage(messages.errorConflict, { operation });
    case 'limit':
      return intl.formatMessage(messages.errorLimit, { operation });
    case 'network':
      return intl.formatMessage(messages.errorNetwork, { operation });
    default:
      return intl.formatMessage(messages.errorGeneric, {
        operation,
        message: error.message,
      });
  }
}
