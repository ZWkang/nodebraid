import { CFlowError, type DiagnosticAttributes } from '@cflow/diagnostics';

export type RendererErrorCode =
  | 'INVALID_DOCUMENT_UPDATE'
  | 'DOCUMENT_OUT_OF_SYNC'
  | 'INVALID_SESSION_SNAPSHOT'
  | 'INVALID_SCREEN_POINT'
  | 'INVALID_INPUT_SUBSCRIBER'
  | 'INVALID_POINTER'
  | 'RENDERER_DISPOSED';

export class RendererError extends CFlowError<'renderer', RendererErrorCode> {
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
