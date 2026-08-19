import { CFlowError, type DiagnosticAttributes } from '@cflow/diagnostics';

export type LayoutErrorCode =
  'INVALID_REQUEST' | 'INVALID_INPUT' | 'UNSUPPORTED_FEATURE' | 'INVALID_PROPOSAL' | 'STALE_PROPOSAL';

export class LayoutError extends CFlowError<'layout', LayoutErrorCode> {
  override readonly name = 'LayoutError';

  constructor(
    code: LayoutErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('layout', code, message, { details, cause: options?.cause });
  }
}
