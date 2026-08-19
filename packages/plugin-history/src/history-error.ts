import { CFlowError, type DiagnosticAttributes } from '@cflow/diagnostics';

export type HistoryErrorCode =
  'UNDO_EMPTY' | 'REDO_EMPTY' | 'HISTORY_BUSY' | 'HISTORY_NOT_CAUGHT_UP' | 'SERVICE_DISPOSED';

export class HistoryError extends CFlowError<'plugin.history', HistoryErrorCode> {
  override readonly name = 'HistoryError';

  constructor(
    code: HistoryErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('plugin.history', code, message, { details, cause: options?.cause });
  }
}
