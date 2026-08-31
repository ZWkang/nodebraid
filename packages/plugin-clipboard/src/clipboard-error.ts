import { NodeBraidError, type DiagnosticAttributes } from '@nodebraid/diagnostics';

export type ClipboardErrorCode =
  | 'INVALID_CONFIG'
  | 'TRANSPORT_READ_FAILED'
  | 'TRANSPORT_WRITE_FAILED'
  | 'CODEC_ENCODE_FAILED'
  | 'CODEC_DECODE_FAILED'
  | 'INVALID_FRAGMENT'
  | 'INVALID_MATERIALIZATION'
  | 'TARGET_CONFLICT'
  | 'COMMIT_FAILED'
  | 'SELECTION_UPDATE_FAILED';

export class ClipboardError extends NodeBraidError<'plugin.clipboard', ClipboardErrorCode> {
  override readonly name = 'ClipboardError';

  constructor(
    code: ClipboardErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('plugin.clipboard', code, message, { details, cause: options?.cause });
  }
}
