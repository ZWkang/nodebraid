import { NodeBraidError, type DiagnosticAttributes } from '@nodebraid/diagnostics';

export type InteractionErrorCode =
  | 'INVALID_CONFIG'
  | 'INVALID_MOVE'
  | 'INVALID_CONNECTION'
  | 'INVALID_DELETE'
  | 'INVALID_SHORTCUT'
  | 'SHORTCUT_ALREADY_REGISTERED'
  | 'SHORTCUT_DISPOSED'
  | 'STALE_GESTURE'
  | 'STALE_SELECTION';

export class InteractionError extends NodeBraidError<'interaction', InteractionErrorCode> {
  override readonly name = 'InteractionError';

  constructor(code: InteractionErrorCode, message: string, details: DiagnosticAttributes = {}) {
    super('interaction', code, message, { details });
  }
}
