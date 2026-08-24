import { CFlowError, type DiagnosticAttributes } from '@cflow/diagnostics';

export type InteractionErrorCode = 'INVALID_CONFIG' | 'INVALID_MOVE' | 'INVALID_CONNECTION' | 'STALE_GESTURE';

export class InteractionError extends CFlowError<'interaction', InteractionErrorCode> {
  override readonly name = 'InteractionError';

  constructor(code: InteractionErrorCode, message: string, details: DiagnosticAttributes = {}) {
    super('interaction', code, message, { details });
  }
}
