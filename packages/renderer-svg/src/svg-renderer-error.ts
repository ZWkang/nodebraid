import { NodeBraidError, type DiagnosticAttributes } from '@nodebraid/diagnostics';

export type SvgRendererErrorCode = 'INVALID_CONFIG' | 'INVALID_TARGET' | 'TARGET_OCCUPIED' | 'TARGET_UNAVAILABLE';

export class SvgRendererError extends NodeBraidError<'renderer.svg', SvgRendererErrorCode> {
  override readonly name = 'SvgRendererError';

  constructor(
    code: SvgRendererErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('renderer.svg', code, message, { details, cause: options?.cause });
  }
}
