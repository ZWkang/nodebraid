import { CFlowError, type CFlowErrorOptions } from './cflow-error';
import type { DiagnosticAttributes } from './diagnostic-value';

export type DiagnosticsErrorCode = 'INVALID_EVENT' | 'INVALID_DIAGNOSTIC_VALUE' | 'ASYNC_SINK' | 'ASYNC_FAULT_REPORTER';

export class DiagnosticsError extends CFlowError<'diagnostics', DiagnosticsErrorCode> {
  override readonly name = 'DiagnosticsError';

  constructor(
    code: DiagnosticsErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Omit<CFlowErrorOptions<DiagnosticAttributes>, 'details'>,
  ) {
    super('diagnostics', code, message, { details, cause: options?.cause });
  }
}
