import { NodeBraidError, type DiagnosticAttributes } from '@nodebraid/diagnostics';

export type InteractionErrorCode = 'INVALID_CONFIG' | 'INVALID_MOVE' | 'INVALID_CONNECTION' | 'STALE_GESTURE';

export class InteractionError extends NodeBraidError<'interaction', InteractionErrorCode> {
  override readonly name = 'InteractionError';

  constructor(code: InteractionErrorCode, message: string, details: DiagnosticAttributes = {}) {
    super('interaction', code, message, { details });
  }
}
