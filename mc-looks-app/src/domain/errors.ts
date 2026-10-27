/** What an API call can fail with, mapped from the GraphQL error. */
export type ErrorKind =
  | 'forbidden'
  | 'conflict'
  | 'duplicate'
  | 'limit'
  | 'network'
  | 'unknown';

export type Operation =
  | 'readProject'
  | 'readLooks'
  | 'readProducts'
  | 'searchProducts'
  | 'readOrders'
  | 'createDiscount'
  | 'activateDiscount'
  | 'switchDiscount'
  | 'changeDiscountValue'
  | 'completeDiscount'
  | 'writeLookObject';

/** An API failure that knows which operation failed, so the message can name it. */
export class LookApiError extends Error {
  readonly operation: Operation;
  readonly kind: ErrorKind;
  readonly statusCode?: number;
  readonly code?: string;
  readonly field?: string;
  readonly original: unknown;

  constructor(
    operation: Operation,
    kind: ErrorKind,
    original: unknown,
    details: {
      statusCode?: number;
      code?: string;
      field?: string;
      message?: string;
    } = {}
  ) {
    super(
      details.message ??
        (original instanceof Error ? original.message : String(original))
    );
    this.name = 'LookApiError';
    this.operation = operation;
    this.kind = kind;
    this.original = original;
    this.statusCode = details.statusCode;
    this.code = details.code;
    this.field = details.field;
  }
}

interface GraphQlErrorLike {
  message?: string;
  extensions?: { code?: string; field?: string; statusCode?: number };
}

const KIND_BY_CODE: Record<string, ErrorKind> = {
  InsufficientScope: 'forbidden',
  access_denied: 'forbidden',
  ConcurrentModification: 'conflict',
  DuplicateField: 'duplicate',
  MaxCartDiscountsReached: 'limit',
};

const STATUS_BY_KIND: Partial<Record<ErrorKind, number>> = {
  forbidden: 403,
  conflict: 409,
  duplicate: 400,
};

/**
 * Maps whatever a GraphQL client threw (Apollo error with `graphQLErrors`,
 * a network error, or an error we raised ourselves) to a `LookApiError`.
 */
export function toLookApiError(
  operation: Operation,
  error: unknown
): LookApiError {
  if (error instanceof LookApiError) return error;
  const graphQlErrors = (
    (error as { graphQLErrors?: GraphQlErrorLike[] } | undefined)
      ?.graphQLErrors ?? []
  ).filter(Boolean);
  const first = graphQlErrors[0];
  const code = first?.extensions?.code;
  const kind: ErrorKind =
    (code && KIND_BY_CODE[code]) ||
    ((error as { networkError?: unknown } | undefined)?.networkError
      ? 'network'
      : 'unknown');
  return new LookApiError(operation, kind, error, {
    statusCode: first?.extensions?.statusCode ?? STATUS_BY_KIND[kind],
    code,
    field: first?.extensions?.field,
    message: first?.message,
  });
}

export const isConflict = (error: unknown): boolean =>
  error instanceof LookApiError && error.kind === 'conflict';

export const isDuplicate = (error: unknown): boolean =>
  error instanceof LookApiError && error.kind === 'duplicate';
