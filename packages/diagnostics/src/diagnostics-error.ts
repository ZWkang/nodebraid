import { NodeBraidError, type NodeBraidErrorOptions } from './nodebraid-error';
import type { DiagnosticAttributes } from './diagnostic-value';

export type DiagnosticsErrorCode = 'INVALID_EVENT' | 'INVALID_DIAGNOSTIC_VALUE' | 'ASYNC_SINK' | 'ASYNC_FAULT_REPORTER';

export class DiagnosticsError extends NodeBraidError<'diagnostics', DiagnosticsErrorCode> {
  override readonly name = 'DiagnosticsError';

  constructor(
    code: DiagnosticsErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Omit<NodeBraidErrorOptions<DiagnosticAttributes>, 'details'>,
  ) {
    super('diagnostics', code, message, { details, cause: options?.cause });
  }
}
