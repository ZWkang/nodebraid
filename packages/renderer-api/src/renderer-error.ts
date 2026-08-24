import { NodeBraidError, type DiagnosticAttributes } from '@nodebraid/diagnostics';

export type RendererErrorCode =
  | 'INVALID_DOCUMENT_UPDATE'
  | 'DOCUMENT_OUT_OF_SYNC'
  | 'INVALID_SESSION_SNAPSHOT'
  | 'INVALID_INTERACTION_PROJECTION'
  | 'INTERACTION_OUT_OF_SYNC'
  | 'INVALID_SCREEN_POINT'
  | 'INVALID_INPUT_SUBSCRIBER'
  | 'INVALID_POINTER'
  | 'RENDERER_DISPOSED';

export class RendererError extends NodeBraidError<'renderer', RendererErrorCode> {
  override readonly name = 'RendererError';

  constructor(
    code: RendererErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('renderer', code, message, { details, cause: options?.cause });
  }
}
