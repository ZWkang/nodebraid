export type LayoutErrorCode =
  'INVALID_REQUEST' | 'INVALID_INPUT' | 'UNSUPPORTED_FEATURE' | 'INVALID_PROPOSAL' | 'STALE_PROPOSAL';

export class LayoutError extends Error {
  override readonly name = 'LayoutError';

  constructor(
    readonly code: LayoutErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
  }
}
