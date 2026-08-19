import { CFlowError, type DiagnosticAttributes } from '@cflow/diagnostics';

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
export class KernelError extends CFlowError<'kernel', KernelErrorCode> {
  override readonly name = 'KernelError';

  constructor(
    code: KernelErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('kernel', code, message, { details, cause: options?.cause });
  }
}
