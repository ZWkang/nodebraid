export type SessionErrorCode =
  'INVALID_SELECTION' | 'SELECTION_ENTITY_NOT_FOUND' | 'INVALID_VIEWPORT' | 'INVALID_SUBSCRIBER' | 'SERVICE_DISPOSED';

export class SessionError extends Error {
  override readonly name = 'SessionError';

  constructor(
    readonly code: SessionErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
  }
}
