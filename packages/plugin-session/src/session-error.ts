import { CFlowError, type DiagnosticAttributes } from '@cflow/diagnostics';

export type SessionErrorCode =
  'INVALID_SELECTION' | 'SELECTION_ENTITY_NOT_FOUND' | 'INVALID_VIEWPORT' | 'INVALID_SUBSCRIBER' | 'SERVICE_DISPOSED';

export class SessionError extends CFlowError<'plugin.session', SessionErrorCode> {
  override readonly name = 'SessionError';

  constructor(
    code: SessionErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('plugin.session', code, message, { details, cause: options?.cause });
  }
}
