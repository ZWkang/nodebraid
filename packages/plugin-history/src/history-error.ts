export type HistoryErrorCode =
  'UNDO_EMPTY' | 'REDO_EMPTY' | 'HISTORY_BUSY' | 'HISTORY_NOT_CAUGHT_UP' | 'SERVICE_DISPOSED';

export class HistoryError extends Error {
  override readonly name = 'HistoryError';

  constructor(
    readonly code: HistoryErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
  }
}
