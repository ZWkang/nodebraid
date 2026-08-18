export type KernelErrorCode =
  | 'INVALID_ID'
  | 'ENTITY_NOT_FOUND'
  | 'ENTITY_ALREADY_EXISTS'
  | 'ENTITY_ID_MISMATCH'
  | 'INVALID_GRAPH'
  | 'ASYNC_TRANSACTION'
  | 'TRANSACTION_REENTRANT'
  | 'TRANSACTION_CLOSED'
  | 'CHANGE_SET_CONFLICT'
  | 'INVALID_CHANGE_SET'
  | 'REVISION_OVERFLOW';

/** Structural Kernel failures use stable codes; callback failures are deliberately left untouched. */
export class KernelError extends Error {
  override readonly name = 'KernelError';

  constructor(
    readonly code: KernelErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
  }
}
