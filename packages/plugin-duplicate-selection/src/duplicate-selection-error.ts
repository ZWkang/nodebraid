import { NodeBraidError, type DiagnosticAttributes } from '@nodebraid/diagnostics';

export type DuplicateSelectionErrorCode =
  'INVALID_CONFIG' | 'INVALID_MATERIALIZATION' | 'STALE_DUPLICATE' | 'SELECTION_UPDATE_FAILED';

export class DuplicateSelectionError extends NodeBraidError<'plugin.duplicate-selection', DuplicateSelectionErrorCode> {
  override readonly name = 'DuplicateSelectionError';

  constructor(
    code: DuplicateSelectionErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('plugin.duplicate-selection', code, message, { details, cause: options?.cause });
  }
}
